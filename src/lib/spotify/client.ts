import type { CurrentlyPlayingResponse, AudioFeatures, RecentlyPlayedResponse } from '@/types';
import { SpotifyAPIError } from './errors';

const SPOTIFY_API_BASE = 'https://api.spotify.com/v1';

// Device type from Spotify API
export interface SpotifyDevice {
  id: string;
  is_active: boolean;
  is_private_session: boolean;
  is_restricted: boolean;
  name: string;
  type: string;
  volume_percent: number;
}

interface DevicesResponse {
  devices: SpotifyDevice[];
}

class SpotifyClient {
  private audioFeaturesCache = new Map<string, AudioFeatures>();

  private async fetch<T>(endpoint: string, accessToken: string, options?: RequestInit): Promise<T | null> {
    const response = await fetch(`${SPOTIFY_API_BASE}${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      throw new SpotifyAPIError(
        429,
        'Rate limited by Spotify',
        retryAfter ? parseInt(retryAfter, 10) : 30
      );
    }

    // Handle auth errors (token expired)
    if (response.status === 401) {
      throw new SpotifyAPIError(401, 'Unauthorized - token may be expired');
    }

    // Handle no content (nothing playing, or successful command)
    if (response.status === 204) {
      return null;
    }

    // Handle forbidden (premium required)
    if (response.status === 403) {
      throw new SpotifyAPIError(403, 'Spotify Premium required for playback control');
    }

    // Handle not found (no active device)
    if (response.status === 404) {
      throw new SpotifyAPIError(404, 'No active device found. Open Spotify on a device first.');
    }

    if (!response.ok) {
      throw new SpotifyAPIError(response.status, `API request failed: ${response.statusText}`);
    }

    // Check if response has content
    const text = await response.text();
    if (!text) return null;
    
    return JSON.parse(text);
  }

  async getNowPlaying(accessToken: string): Promise<CurrentlyPlayingResponse | null> {
    return this.fetch<CurrentlyPlayingResponse>('/me/player/currently-playing', accessToken);
  }

  async getAudioFeatures(trackId: string, accessToken: string): Promise<AudioFeatures | null> {
    // Check cache first - audio features never change for a track
    const cached = this.audioFeaturesCache.get(trackId);
    if (cached) {
      return cached;
    }

    const features = await this.fetch<AudioFeatures>(`/audio-features/${trackId}`, accessToken);

    if (features) {
      this.audioFeaturesCache.set(trackId, features);
    }

    return features;
  }

  async getRecentlyPlayed(accessToken: string, limit = 20): Promise<RecentlyPlayedResponse | null> {
    return this.fetch<RecentlyPlayedResponse>(
      `/me/player/recently-played?limit=${limit}`,
      accessToken
    );
  }

  // === PLAYBACK CONTROLS ===
  
  async play(accessToken: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  async pause(accessToken: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId ? `/me/player/pause?device_id=${deviceId}` : '/me/player/pause';
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  async next(accessToken: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId ? `/me/player/next?device_id=${deviceId}` : '/me/player/next';
    await this.fetch(endpoint, accessToken, { method: 'POST' });
  }

  async previous(accessToken: string, deviceId?: string): Promise<void> {
    const endpoint = deviceId ? `/me/player/previous?device_id=${deviceId}` : '/me/player/previous';
    await this.fetch(endpoint, accessToken, { method: 'POST' });
  }

  async seek(accessToken: string, positionMs: number, deviceId?: string): Promise<void> {
    const endpoint = deviceId 
      ? `/me/player/seek?position_ms=${positionMs}&device_id=${deviceId}` 
      : `/me/player/seek?position_ms=${positionMs}`;
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  async setVolume(accessToken: string, volumePercent: number, deviceId?: string): Promise<void> {
    const endpoint = deviceId 
      ? `/me/player/volume?volume_percent=${volumePercent}&device_id=${deviceId}` 
      : `/me/player/volume?volume_percent=${volumePercent}`;
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  async setShuffle(accessToken: string, state: boolean, deviceId?: string): Promise<void> {
    const endpoint = deviceId 
      ? `/me/player/shuffle?state=${state}&device_id=${deviceId}` 
      : `/me/player/shuffle?state=${state}`;
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  async setRepeat(accessToken: string, state: 'track' | 'context' | 'off', deviceId?: string): Promise<void> {
    const endpoint = deviceId 
      ? `/me/player/repeat?state=${state}&device_id=${deviceId}` 
      : `/me/player/repeat?state=${state}`;
    await this.fetch(endpoint, accessToken, { method: 'PUT' });
  }

  // === DEVICES ===
  
  async getDevices(accessToken: string): Promise<SpotifyDevice[]> {
    const result = await this.fetch<DevicesResponse>('/me/player/devices', accessToken);
    return result?.devices ?? [];
  }

  async transferPlayback(accessToken: string, deviceId: string, play = true): Promise<void> {
    await this.fetch('/me/player', accessToken, {
      method: 'PUT',
      body: JSON.stringify({
        device_ids: [deviceId],
        play,
      }),
    });
  }

  // === LIBRARY ===
  
  async saveTrack(accessToken: string, trackId: string): Promise<void> {
    await this.fetch(`/me/tracks?ids=${trackId}`, accessToken, { method: 'PUT' });
  }

  async removeTrack(accessToken: string, trackId: string): Promise<void> {
    await this.fetch(`/me/tracks?ids=${trackId}`, accessToken, { method: 'DELETE' });
  }

  async checkSavedTrack(accessToken: string, trackId: string): Promise<boolean> {
    const result = await this.fetch<boolean[]>(`/me/tracks/contains?ids=${trackId}`, accessToken);
    return result?.[0] ?? false;
  }
}

export const spotifyClient = new SpotifyClient();

