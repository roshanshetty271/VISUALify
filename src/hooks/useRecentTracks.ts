'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/stores';
import { spotifyClient } from '@/lib/spotify';
import { normalizeTrack } from '@/types';

export function useRecentTracks() {
  const { data: session } = useSession();
  const currentTrackId = usePlayerStore((s) => s.currentTrack?.id);

  useEffect(() => {
    if (!session?.accessToken) return;
    const accessToken = session.accessToken;

    const fetchRecent = async () => {
      try {
        const data = await spotifyClient.getRecentlyPlayed(accessToken, 20);
        if (data?.items) {
          const tracks = data.items
            .map((item) => normalizeTrack(item.track, item.played_at))
            .filter((track, index, arr) => arr.findIndex((t) => t.id === track.id) === index);
          usePlayerStore.getState().setRecentTracks(tracks);
        }
      } catch (err) {
        console.error('Failed to fetch recent tracks:', err);
      }
    };

    fetchRecent();
    // Refresh frequently so queue updates without manual sync clicks.
    const interval = setInterval(fetchRecent, 30 * 1000);

    return () => clearInterval(interval);
  }, [session?.accessToken, currentTrackId]);
}

