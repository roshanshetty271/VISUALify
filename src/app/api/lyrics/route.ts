import { NextRequest, NextResponse } from 'next/server';

const LRCLIB_BASE = 'https://lrclib.net/api';
const UA = 'VISUALify v1.0 (https://visualify.app)';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const trackName = searchParams.get('track_name');
  const artistName = searchParams.get('artist_name');
  const albumName = searchParams.get('album_name') ?? '';
  const duration = searchParams.get('duration');

  if (!trackName || !artistName) {
    return NextResponse.json({ error: 'track_name and artist_name required' }, { status: 400 });
  }

  const headers = { 'User-Agent': UA };

  try {
    // Try exact match first
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      ...(albumName && { album_name: albumName }),
      ...(duration && { duration }),
    });

    const res = await fetch(`${LRCLIB_BASE}/get?${params}`, { headers });

    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
      });
    }

    // Fallback: search endpoint
    const searchParams2 = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
    });

    const searchRes = await fetch(`${LRCLIB_BASE}/search?${searchParams2}`, { headers });

    if (!searchRes.ok) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    const results = await searchRes.json();
    // Prefer results with synced lyrics (timestamped) over plain-only
    const syncedMatch = (results as Array<Record<string, unknown>>).find(
      (r: Record<string, unknown>) => r.syncedLyrics
    );
    const plainMatch = (results as Array<Record<string, unknown>>).find(
      (r: Record<string, unknown>) => r.plainLyrics
    );
    const match = syncedMatch || plainMatch;

    if (!match) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }

    return NextResponse.json(match, {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    });
  } catch (err) {
    console.error('[lyrics] fetch error:', err);
    return NextResponse.json({ error: 'upstream_error' }, { status: 502 });
  }
}
