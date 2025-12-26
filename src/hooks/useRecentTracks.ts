'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/stores';
import { spotifyClient } from '@/lib/spotify';
import { normalizeTrack } from '@/types';

export function useRecentTracks() {
  const { data: session } = useSession();
  const { setRecentTracks } = usePlayerStore();

  useEffect(() => {
    if (!session?.accessToken) return;

    const fetchRecent = async () => {
      try {
        const data = await spotifyClient.getRecentlyPlayed(session.accessToken, 10);
        if (data?.items) {
          const tracks = data.items.map((item) =>
            normalizeTrack(item.track, item.played_at)
          );
          setRecentTracks(tracks);
        }
      } catch (err) {
        console.error('Failed to fetch recent tracks:', err);
      }
    };

    fetchRecent();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecent, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [session?.accessToken, setRecentTracks]);
}

