'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/stores';
import { spotifyClient, SpotifyAPIError } from '@/lib/spotify';
import { normalizeTrack } from '@/types';

const POLL_INTERVAL_PLAYING = 2000;  // 2 seconds when playing (faster sync)
const POLL_INTERVAL_IDLE = 5000;     // 5 seconds when idle
const PROGRESS_UPDATE_INTERVAL = 50;  // 50ms for smoother progress

export function useNowPlaying() {
  const { data: session } = useSession();
  const store = usePlayerStore();
  const isRateLimited = useRef(false);
  const rateLimitTimeout = useRef<NodeJS.Timeout | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  const fetchNowPlaying = useCallback(async (isManualSync = false) => {
    if (!session?.accessToken) return;
    
    // For manual sync, ignore rate limit
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
        
        // Store progress and duration
        store.setProgress(data.progress_ms);
        store.setDuration(data.item.duration_ms);

        // Fetch audio features for the track
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
          // Rate limited - back off (but keep it short for better UX)
          isRateLimited.current = true;
          const delay = Math.min((err.retryAfter ?? 5) * 1000, 5000); // Max 5 seconds

          rateLimitTimeout.current = setTimeout(() => {
            isRateLimited.current = false;
          }, delay);

          if (!isManualSync) {
            store.setError('syncing');
          }
        } else if (err.status === 401) {
          // Token issue - session guard will handle re-login
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

  // Manual sync function - exposed for UI button
  const forceSync = useCallback(() => {
    fetchNowPlaying(true);
  }, [fetchNowPlaying]);

  // Local progress interpolation for smooth progress bar
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

  // Visibility-aware polling
  useEffect(() => {
    if (!session?.accessToken) return;

    let intervalId: NodeJS.Timeout;

    const startPolling = () => {
      fetchNowPlaying();
      const interval = store.isPlaying ? POLL_INTERVAL_PLAYING : POLL_INTERVAL_IDLE;
      intervalId = setInterval(fetchNowPlaying, interval);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      if (rateLimitTimeout.current) {
        clearTimeout(rateLimitTimeout.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.accessToken, fetchNowPlaying, store.isPlaying]);

  return { forceSync };
}
