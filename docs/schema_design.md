# VISUALify - Schema Design

## Overview

This document defines the data models used in VISUALify, including Spotify API response types and application state.

---

## Spotify API Types

### Track

```typescript
// src/types/spotify.ts

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
```

### Audio Features

```typescript
export interface AudioFeatures {
  id: string;
  
  // 0.0 to 1.0 - Higher = more energetic
  energy: number;
  
  // BPM (typically 50-200)
  tempo: number;
  
  // 0.0 to 1.0 - Higher = more positive/happy
  valence: number;
  
  // 0.0 to 1.0 - Higher = more danceable
  danceability: number;
  
  // -60 to 0 dB - Higher = louder
  loudness: number;
  
  // 0.0 to 1.0 - Higher = more acoustic
  acousticness: number;
  
  // 0.0 to 1.0 - Higher = more instrumental (no vocals)
  instrumentalness: number;
  
  // 0.0 to 1.0 - Higher = more live recording
  liveness: number;
  
  // 0.0 to 1.0 - Higher = more spoken word
  speechiness: number;
  
  // Musical key (0 = C, 1 = C#, etc.)
  key: number;
  
  // 0 = minor, 1 = major
  mode: number;
  
  // Time signature (3, 4, 5, etc.)
  time_signature: number;
  
  // Duration in ms
  duration_ms: number;
}
```

### Currently Playing Response

```typescript
export interface CurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number;
  timestamp: number;
  item: SpotifyTrack | null;
  currently_playing_type: 'track' | 'episode' | 'ad' | 'unknown';
  context: {
    type: 'album' | 'artist' | 'playlist';
    href: string;
    uri: string;
  } | null;
}
```

### Recently Played Response

```typescript
export interface PlayHistoryItem {
  track: SpotifyTrack;
  played_at: string; // ISO timestamp
  context: {
    type: string;
    uri: string;
  } | null;
}

export interface RecentlyPlayedResponse {
  items: PlayHistoryItem[];
  next: string | null;
  cursors: {
    after: string;
    before: string;
  };
  limit: number;
}
```

---

## Application Types

### Track (Normalized)

```typescript
// src/types/visualizer.ts

export interface Track {
  id: string;
  name: string;
  artist: string;       // Primary artist name
  artistId: string;
  albumName: string;
  albumArt: string;     // URL to largest image
  duration: number;     // milliseconds
  popularity: number;   // 0-100
  previewUrl: string | null;
  playedAt?: string;    // ISO timestamp (for recent tracks)
}

// Transform function
export function normalizeTrack(spotifyTrack: SpotifyTrack): Track {
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
  };
}
```

### Visualization Node

```typescript
export interface VisualizationNode {
  id: string;
  track: Track;
  audioFeatures: AudioFeatures | null;
  
  // Position (set by D3 force simulation)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null; // Fixed position
  fy?: number | null;
  
  // Visual properties (derived from audio features)
  color: string;
  size: number;
  glowIntensity: number;
  pulseSpeed: number;
}
```

### Visual Properties Mapping

```typescript
export interface VisualProperties {
  // Color mapping
  hue: number;        // 0-360, derived from energy
  saturation: number; // 0-100, derived from danceability
  lightness: number;  // 0-100, derived from valence
  
  // Size mapping
  radius: number;     // pixels, derived from loudness/popularity
  
  // Animation mapping
  pulseSpeed: number; // seconds, derived from tempo (60/BPM)
  glowRadius: number; // pixels, derived from energy
  
  // Position hints
  orbitRadius: number; // derived from recency
}

// Mapping function
export function mapAudioToVisual(
  features: AudioFeatures,
  recencyIndex: number // 0 = current, higher = older
): VisualProperties {
  return {
    // Energy → Hue (blue=calm → red=energetic)
    hue: features.energy * 240, // 0=blue, 240=red
    
    // Danceability → Saturation
    saturation: 50 + features.danceability * 50,
    
    // Valence → Lightness (sad=dark, happy=bright)
    lightness: 30 + features.valence * 40,
    
    // Loudness → Size
    radius: 20 + ((features.loudness + 60) / 60) * 40,
    
    // Tempo → Pulse Speed
    pulseSpeed: 60 / features.tempo,
    
    // Energy → Glow
    glowRadius: 10 + features.energy * 30,
    
    // Recency → Orbit Radius
    orbitRadius: 50 + recencyIndex * 30,
  };
}
```

---

## Store Types

### Player Store

```typescript
// src/types/store.ts

export interface PlayerState {
  // Data
  currentTrack: Track | null;
  audioFeatures: AudioFeatures | null;
  recentTracks: Track[];
  
  // Status
  isPlaying: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null; // timestamp
  
  // Rate limiting
  isRateLimited: boolean;
  retryAfter: number | null;
}

export interface PlayerActions {
  setCurrentTrack: (track: Track | null) => void;
  setAudioFeatures: (features: AudioFeatures | null) => void;
  setRecentTracks: (tracks: Track[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setRateLimited: (limited: boolean, retryAfter?: number) => void;
  reset: () => void;
}

export type PlayerStore = PlayerState & PlayerActions;
```

### Visualizer Store

```typescript
export type VisualizationMode = 'galaxy' | 'terrain' | 'neural' | 'river';

export interface VisualizerState {
  mode: VisualizationMode;
  isAnimating: boolean;
  showLabels: boolean;
  colorScheme: 'default' | 'monochrome' | 'neon';
}

export interface VisualizerActions {
  setMode: (mode: VisualizationMode) => void;
  setIsAnimating: (animating: boolean) => void;
  setShowLabels: (show: boolean) => void;
  setColorScheme: (scheme: VisualizerState['colorScheme']) => void;
}

export type VisualizerStore = VisualizerState & VisualizerActions;
```

---

## API Response Types

### Auth Session

```typescript
// Extended NextAuth session type
import { Session } from 'next-auth';

export interface ExtendedSession extends Session {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: 'RefreshAccessTokenError';
}
```

### Error Types

```typescript
export interface APIError {
  status: number;
  message: string;
  retryAfter?: number; // For 429 errors
}

export class SpotifyAPIError extends Error {
  status: number;
  retryAfter?: number;

  constructor(status: number, message: string, retryAfter?: number) {
    super(message);
    this.name = 'SpotifyAPIError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}
```

---

## Cache Types

```typescript
// Audio features cache (in-memory)
export type AudioFeaturesCache = Map<string, {
  features: AudioFeatures;
  cachedAt: number;
}>;

// Cache TTL: 24 hours (features don't change)
export const CACHE_TTL = 24 * 60 * 60 * 1000;

export function isCacheValid(cachedAt: number): boolean {
  return Date.now() - cachedAt < CACHE_TTL;
}
```

---

## Utility Types

```typescript
// Make all properties optional except specified keys
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

// Extract array element type
export type ArrayElement<T> = T extends (infer U)[] ? U : never;

// Nullable type
export type Nullable<T> = T | null;

// API response wrapper
export type APIResponse<T> = 
  | { success: true; data: T }
  | { success: false; error: APIError };
```

---

## Example Usage

```typescript
// In a component
import type { Track, AudioFeatures, VisualizationNode } from '@/types';

function GalaxyMode({ tracks }: { tracks: VisualizationNode[] }) {
  return (
    <svg>
      {tracks.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.size}
          fill={node.color}
        />
      ))}
    </svg>
  );
}

// In a store
import { create } from 'zustand';
import type { PlayerStore } from '@/types';

export const usePlayerStore = create<PlayerStore>((set) => ({
  currentTrack: null,
  // ... rest of implementation
}));
```
