'use client';

import { useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { spotifyClient, SpotifyAPIError } from '@/lib/spotify';
import { usePlayerStore } from '@/stores';

export function usePlaybackControls() {
  const { data: session } = useSession();
  const store = usePlayerStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: unknown) => {
    if (err instanceof SpotifyAPIError) {
      setError(err.message);
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } else {
      setError('An error occurred');
      setTimeout(() => setError(null), 3000);
    }
  }, []);

  const play = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      await spotifyClient.play(session.accessToken);
      store.setIsPlaying(true);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, store, handleError]);

  const pause = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      await spotifyClient.pause(session.accessToken);
      store.setIsPlaying(false);
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, store, handleError]);

  const togglePlayPause = useCallback(async () => {
    if (store.isPlaying) {
      await pause();
    } else {
      await play();
    }
  }, [store.isPlaying, play, pause]);

  const next = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      await spotifyClient.next(session.accessToken);
      // Sync will pick up the new track
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, handleError]);

  const previous = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    try {
      await spotifyClient.previous(session.accessToken);
      // Sync will pick up the new track
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, handleError]);

  const seek = useCallback(async (positionMs: number) => {
    if (!session?.accessToken) return;
    try {
      await spotifyClient.seek(session.accessToken, positionMs);
      store.setProgress(positionMs);
    } catch (err) {
      handleError(err);
    }
  }, [session?.accessToken, store, handleError]);

  const setVolume = useCallback(async (volumePercent: number) => {
    if (!session?.accessToken) return;
    try {
      await spotifyClient.setVolume(session.accessToken, Math.round(volumePercent));
    } catch (err) {
      handleError(err);
    }
  }, [session?.accessToken, handleError]);

  return {
    play,
    pause,
    togglePlayPause,
    next,
    previous,
    seek,
    setVolume,
    isLoading,
    error,
  };
}

