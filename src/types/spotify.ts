// Spotify API Response Types

export interface SpotifyImage {
  url: string;
  height: number;
  width: number;
}

export interface SpotifyArtist {
  id: string;
  name: string;
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  images: SpotifyImage[];
  uri: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  popularity: number;
  preview_url: string | null;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  is_local: boolean;
}

export interface AudioFeatures {
  id: string;
  energy: number;           // 0.0 to 1.0
  tempo: number;            // BPM (typically 50-200)
  valence: number;          // 0.0 to 1.0 (happiness)
  danceability: number;     // 0.0 to 1.0
  loudness: number;         // -60 to 0 dB
  acousticness: number;     // 0.0 to 1.0
  instrumentalness: number; // 0.0 to 1.0
  liveness: number;         // 0.0 to 1.0
  speechiness: number;      // 0.0 to 1.0
  key: number;              // 0-11 (C=0, C#=1, etc.)
  mode: number;             // 0 = minor, 1 = major
  time_signature: number;
  duration_ms: number;
}

export interface CurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number;
  timestamp: number;
  item: SpotifyTrack | null;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
}

export interface RecentlyPlayedResponse {
  items: Array<{
    track: SpotifyTrack;
    played_at: string;
  }>;
  next: string | null;
  limit: number;
}

// Normalized App Types

export interface Track {
  id: string;
  name: string;
  artist: string;
  artistId: string;
  albumName: string;
  albumArt: string;
  duration: number;
  popularity: number;
  previewUrl: string | null;
  playedAt?: string;
}

// Utility function
export function normalizeTrack(spotifyTrack: SpotifyTrack, playedAt?: string): Track {
  return {
    id: spotifyTrack.id,
    name: spotifyTrack.name,
    artist: spotifyTrack.artists[0]?.name ?? 'Unknown Artist',
    artistId: spotifyTrack.artists[0]?.id ?? '',
    albumName: spotifyTrack.album.name,
    albumArt: spotifyTrack.album.images[0]?.url ?? '',
    duration: spotifyTrack.duration_ms,
    popularity: spotifyTrack.popularity,
    previewUrl: spotifyTrack.preview_url,
    playedAt,
  };
}

