'use client';

import { useCallback, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { spotifyClient, SpotifyAPIError } from '@/lib/spotify';
import type { SpotifyDevice } from '@/lib/spotify/client';

export function useDevices() {
  const { data: session } = useSession();
  const [devices, setDevices] = useState<SpotifyDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDevices = useCallback(async () => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await spotifyClient.getDevices(session.accessToken);
      setDevices(result);
    } catch (err) {
      if (err instanceof SpotifyAPIError) {
        setError(err.message);
      } else {
        setError('Failed to fetch devices');
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken]);

  const transferPlayback = useCallback(async (deviceId: string) => {
    if (!session?.accessToken) return;
    setIsLoading(true);
    
    try {
      await spotifyClient.transferPlayback(session.accessToken, deviceId, true);
      // Refresh devices list
      await fetchDevices();
    } catch (err) {
      if (err instanceof SpotifyAPIError) {
        setError(err.message);
        setTimeout(() => setError(null), 3000);
      }
    } finally {
      setIsLoading(false);
    }
  }, [session?.accessToken, fetchDevices]);

  // Fetch devices on mount
  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const activeDevice = devices.find(d => d.is_active);

  return {
    devices,
    activeDevice,
    isLoading,
    error,
    fetchDevices,
    transferPlayback,
  };
}

