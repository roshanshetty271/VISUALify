export interface SyncedLine {
  time: number;
  text: string;
}

interface LrcLibResponse {
  id: number;
  trackName: string;
  artistName: string;
  syncedLyrics: string | null;
  plainLyrics: string | null;
  instrumental: boolean;
}

function parseSyncedLyrics(raw: string): SyncedLine[] {
  const lines: SyncedLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/g;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(raw)) !== null) {
    const mins = parseInt(match[1], 10);
    const secs = parseInt(match[2], 10);
    const ms = match[3].length === 2
      ? parseInt(match[3], 10) * 10
      : parseInt(match[3], 10);
    const timeMs = mins * 60000 + secs * 1000 + ms;
    const text = match[4].trim();
    if (text) lines.push({ time: timeMs, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

function parsePlainLyrics(raw: string): string[] {
  return raw
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

const cache = new Map<string, { synced: SyncedLine[]; plain: string[] } | null>();

export async function fetchLyrics(
  trackName: string,
  artistName: string,
  albumName: string,
  durationSec: number
): Promise<{ synced: SyncedLine[]; plain: string[] } | null> {
  const key = `${trackName}|${artistName}|${durationSec}`;
  if (cache.has(key)) return cache.get(key) ?? null;

  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      album_name: albumName,
      duration: String(Math.round(durationSec)),
    });

    const res = await fetch(`/api/lyrics?${params}`);

    if (!res.ok) {
      cache.set(key, null);
      return null;
    }

    const data: LrcLibResponse = await res.json();

    if (data.instrumental) {
      cache.set(key, null);
      return null;
    }

    const result = {
      synced: data.syncedLyrics ? parseSyncedLyrics(data.syncedLyrics) : [],
      plain: data.plainLyrics ? parsePlainLyrics(data.plainLyrics) : [],
    };
    cache.set(key, result);
    return result;
  } catch {
    cache.set(key, null);
    return null;
  }
}
