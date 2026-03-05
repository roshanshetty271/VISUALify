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

    const s = usePlayerStore.getState();

    if (isManualSync) {
      s.setIsSyncing(true);
    }

    try {
      const data = await spotifyClient.getNowPlaying(session.accessToken);

      if (data?.item && data.currently_playing_type === 'track') {
        const track = normalizeTrack(data.item);
        s.setCurrentTrack(track);
        s.setIsPlaying(data.is_playing);
        s.setProgress(data.progress_ms);
        s.setDuration(data.item.duration_ms);

        // Fetch audio features (non-blocking — don't let rate limits here block now-playing polling)
        spotifyClient.getAudioFeatures(track.id, session.accessToken)
          .then(features => {
            if (features) {
              usePlayerStore.getState().setAudioFeatures(features);
            }
          })
          .catch(err => {
            console.warn('[useNowPlaying] Audio features fetch failed (non-blocking):', err?.status || err);
          });
      } else {
        s.setCurrentTrack(null);
        s.setIsPlaying(false);
        s.setAudioFeatures(null);
        s.setProgress(0);
        s.setDuration(0);
      }

      s.setError(null);
      s.setIsLoading(false);
      s.setLastSyncTime(Date.now());
    } catch (err) {
      if (err instanceof SpotifyAPIError) {
        if (err.status === 429) {
          isRateLimited.current = true;
          const delay = Math.min((err.retryAfter ?? 5) * 1000, 5000);
          rateLimitTimeout.current = setTimeout(() => {
            isRateLimited.current = false;
          }, delay);
          if (!isManualSync) s.setError('syncing');
        } else if (err.status === 401) {
          s.setError('unauthorized');
        } else {
          s.setError(err.message);
        }
      } else {
        s.setError('Failed to fetch playback');
      }
      s.setIsLoading(false);
    } finally {
      if (isManualSync) {
        usePlayerStore.getState().setIsSyncing(false);
      }
    }
  }, [session?.accessToken]);

  // Manual sync function
  const forceSync = useCallback(() => {
    if (wsConnected) {
      usePlayerStore.getState().setLastSyncTime(Date.now());
    } else {
      fetchNowPlaying(true);
    }
  }, [wsConnected, fetchNowPlaying]);

  // === LOCAL PROGRESS INTERPOLATION ===
  useEffect(() => {
    if (store.isPlaying) {
      progressInterval.current = setInterval(() => {
        usePlayerStore.getState().incrementProgress(PROGRESS_UPDATE_INTERVAL);
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
  }, [store.isPlaying]);

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
