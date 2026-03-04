import { useEffect, useRef, useState } from 'react';
import { useCurrentTrack, useProgress, useDuration } from '@/stores';
import { fetchLyrics, type SyncedLine } from '@/lib/utils/lrclib';

interface LyricsState {
  synced: SyncedLine[];
  plain: string[];
  currentLineIndex: number;
  isLoading: boolean;
  hasLyrics: boolean;
}

export function useLyrics(): LyricsState {
  const track = useCurrentTrack();
  const progress = useProgress();
  const duration = useDuration();
  const [synced, setSynced] = useState<SyncedLine[]>([]);
  const [plain, setPlain] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!track || track.id === lastTrackIdRef.current) return;
    lastTrackIdRef.current = track.id;

    let cancelled = false;
    setIsLoading(true);
    setSynced([]);
    setPlain([]);

    const durationSec = (duration || track.duration) / 1000;

    fetchLyrics(track.name, track.artist, track.albumName ?? '', durationSec).then(result => {
      if (cancelled) return;
      setIsLoading(false);
      if (result) {
        setSynced(result.synced);
        setPlain(result.plain);
      }
    });

    return () => { cancelled = true; };
  }, [track, duration]);

  // Find current line index based on playback progress
  let currentLineIndex = -1;
  if (synced.length > 0) {
    for (let i = synced.length - 1; i >= 0; i--) {
      if (progress >= synced[i].time) {
        currentLineIndex = i;
        break;
      }
    }
  }

  const hasLyrics = synced.length > 0 || plain.length > 0;

  return { synced, plain, currentLineIndex, isLoading, hasLyrics };
}
