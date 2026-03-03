// src/hooks/useNowPlaying.ts
'use client';

import { useEffect, useCallback, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/stores';
import { useWebSocket } from './useWebSocket';
import { spotifyClient, SpotifyAPIError } from '@/lib/spotify';
import { normalizeTrack } from '@/types';

const POLL_INTERVAL_PLAYING = 3000;  // 3 seconds when playing (fallback only)
const POLL_INTERVAL_IDLE = 3000;     // 3 seconds when idle to detect new playback quickly
const PROGRESS_UPDATE_INTERVAL = 50; // 50ms for smooth progress bar

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Hook for real-time now playing updates.
 * 
 * Strategy:
 * 1. Try to get backend JWT token on mount
 * 2. If backend available, use WebSocket for real-time updates
 * 3. If WebSocket disconnected/unavailable, fall back to direct Spotify polling
 * 
 * This ensures the app works even without the backend deployed.
 */
export function useNowPlaying() {
  const { data: session } = useSession();
  const store = usePlayerStore();
  
  // Backend token state
  const [backendToken, setBackendToken] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  
  // WebSocket connection
  const { isConnected: wsConnected, error: wsError } = useWebSocket({
    token: backendToken,
    enabled: !!backendToken,
  });

  // Polling refs (for fallback)
  const isRateLimited = useRef(false);
  const rateLimitTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // === BACKEND TOKEN EXCHANGE ===
  useEffect(() => {
    async function exchangeToken() {
      if (!session?.accessToken) {
        setBackendToken(null);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nextauth_token: session.accessToken }),
        });

        if (!response.ok) {
          throw new Error(`Token exchange failed: ${response.status}`);
        }

        const data = await response.json();
        setBackendToken(data.access_token);
        setBackendError(null);
        console.log('[useNowPlaying] Backend token acquired');
      } catch (e) {
        console.warn('[useNowPlaying] Backend unavailable, using fallback polling:', e);
        setBackendError(e instanceof Error ? e.message : 'Backend unavailable');
        setBackendToken(null);
      }
    }

    exchangeToken();
  }, [session?.accessToken]);

  // === FALLBACK POLLING (when WebSocket not available) ===
  const fetchNowPlaying = useCallback(async (isManualSync = false) => {
    if (!session?.accessToken) return;
    if (!isManualSync && isRateLimited.current) return;

    if (isManualSync) {
      store.setIsSyncing(true);
    }

    try {
      const data = await spotifyClient.getNowPlaying(session.accessToken);

      if (data?.item && data.currently_playing_type === 'track') {
        const track = normalizeTrack(data.item);
        store.setCurrentTrack(track);
        store.setIsPlaying(data.is_playing);
        store.setProgress(data.progress_ms);
        store.setDuration(data.item.duration_ms);

        // Fetch audio features
        const features = await spotifyClient.getAudioFeatures(track.id, session.accessToken);
        if (features) {
          store.setAudioFeatures(features);
        }
      } else {
        store.setCurrentTrack(null);
        store.setIsPlaying(false);
        store.setAudioFeatures(null);
        store.setProgress(0);
        store.setDuration(0);
      }

      store.setError(null);
      store.setIsLoading(false);
      store.setLastSyncTime(Date.now());
    } catch (err) {
      if (err instanceof SpotifyAPIError) {
        if (err.status === 429) {
          isRateLimited.current = true;
          const delay = Math.min((err.retryAfter ?? 5) * 1000, 5000);
          rateLimitTimeout.current = setTimeout(() => {
            isRateLimited.current = false;
          }, delay);
          if (!isManualSync) store.setError('syncing');
        } else if (err.status === 401) {
          store.setError('unauthorized');
        } else {
          store.setError(err.message);
        }
      } else {
        store.setError('Failed to fetch playback');
      }
      store.setIsLoading(false);
    } finally {
      if (isManualSync) {
        store.setIsSyncing(false);
      }
    }
  }, [session?.accessToken, store]);

  // Manual sync function
  const forceSync = useCallback(() => {
    if (wsConnected) {
      // If WebSocket connected, just update last sync time
      // The server will push the latest state
      store.setLastSyncTime(Date.now());
    } else {
      // Fallback to direct polling
      fetchNowPlaying(true);
    }
  }, [wsConnected, fetchNowPlaying, store]);

  // === LOCAL PROGRESS INTERPOLATION ===
  useEffect(() => {
    if (store.isPlaying) {
      progressInterval.current = setInterval(() => {
        store.incrementProgress(PROGRESS_UPDATE_INTERVAL);
      }, PROGRESS_UPDATE_INTERVAL);
    } else {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    }

    return () => {
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [store.isPlaying, store]);

  const wsEnabled = !!process.env.NEXT_PUBLIC_WS_URL;

  // === FALLBACK POLLING (only when WebSocket is not active) ===
  useEffect(() => {
    // Only skip polling when WebSocket is actually connected.
    // Having a backend token alone does not guarantee a live WS connection.
    if (wsEnabled && wsConnected) return;
    if (!session?.accessToken) return;

    console.log('[useNowPlaying] Using fallback polling');

    let timeoutId: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const poll = async () => {
      if (isCancelled || document.hidden) return;

      await fetchNowPlaying();

      const isPlayingNow = usePlayerStore.getState().isPlaying;
      const interval = isPlayingNow ? POLL_INTERVAL_PLAYING : POLL_INTERVAL_IDLE;

      if (!isCancelled) {
        timeoutId = setTimeout(poll, interval);
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } else {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        void poll();
      }
    };

    void poll();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (rateLimitTimeout.current) {
        clearTimeout(rateLimitTimeout.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.accessToken, wsConnected, wsEnabled, fetchNowPlaying]);

  return {
    forceSync,
    isWebSocketConnected: wsEnabled && wsConnected,
    isUsingFallback: !wsEnabled || !wsConnected,
    backendError,
    wsError,
  };
}
