// Types for Stats Dashboard and Mood Journey features

export type Period = 'day' | 'week' | 'month' | 'year' | 'all';

export interface StatsSummary {
  totalPlays: number;
  totalMinutes: number;
  uniqueTracks: number;
  uniqueArtists: number;
  topGenre: string | null;
}

export interface ListeningTimeData {
  date: string;      // ISO date
  minutes: number;
  playCount: number;
}

export interface TopArtist {
  artistId: string;
  artistName: string;
  playCount: number;
  imageUrl: string | null;
}

export interface AudioProfile {
  energy: number;          // 0-1
  valence: number;         // 0-1 (happiness)
  danceability: number;    // 0-1
  acousticness: number;    // 0-1
  instrumentalness: number; // 0-1
}

export interface MusicPhase {
  name: string;           // "Chill Evenings", "High Energy Mornings"
  moodColor: string;      // hex color
  avgEnergy: number;
  avgValence: number;
  topGenre: string;
  trackCount: number;
  topTrack: {
    name: string;
    artist: string;
    albumArt: string;
  };
}

export interface MoodJourneyPoint {
  playId: string;
  trackName: string;
  artistName: string;
  albumArt: string;
  playedAt: string;       // ISO timestamp
  energy: number;
  valence: number;
}

