// API client for Stats Dashboard endpoints

import type {
  Period,
  StatsSummary,
  ListeningTimeData,
  TopArtist,
  AudioProfile,
  MusicPhase,
  MoodJourneyPoint,
} from '@/types/stats';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

/**
 * Fetch helper that adds Authorization header
 */
async function fetchWithAuth<T>(endpoint: string, token: string): Promise<T> {
  const res = await fetch(`${API_URL}${endpoint}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/**
 * Stats API client
 */
export const statsApi = {
  getSummary: (token: string, period: Period) =>
    fetchWithAuth<StatsSummary>(`/api/stats/summary?period=${period}`, token),

  getListeningTime: (token: string, period: Period) =>
    fetchWithAuth<ListeningTimeData[]>(
      `/api/stats/listening-time?period=${period}`,
      token
    ),

  getTopArtists: (token: string, period: Period, limit = 5) =>
    fetchWithAuth<TopArtist[]>(
      `/api/stats/top-artists?period=${period}&limit=${limit}`,
      token
    ),

  getAudioProfile: (token: string, period: Period) =>
    fetchWithAuth<AudioProfile>(
      `/api/stats/audio-profile?period=${period}`,
      token
    ),

  getMusicPhases: (token: string, period: Period) =>
    fetchWithAuth<MusicPhase[]>(
      `/api/stats/music-phases?period=${period}`,
      token
    ),

  getMoodJourney: (token: string, period: Period) =>
    fetchWithAuth<MoodJourneyPoint[]>(
      `/api/stats/mood-journey?period=${period}`,
      token
    ),

  syncHistory: (token: string) =>
    fetch(`${API_URL}/api/stats/sync-history`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()) as Promise<{ imported: number; updated: number; message: string; error?: string }>,

  backfillFeatures: (token: string) =>
    fetch(`${API_URL}/api/stats/backfill-features`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).then(res => res.json()) as Promise<{ tracks_updated: number; plays_updated: number; message: string; error?: string }>,
};

