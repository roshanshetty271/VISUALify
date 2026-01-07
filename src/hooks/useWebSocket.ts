// src/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { usePlayerStore } from '@/stores';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

interface WebSocketState {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
}

interface UseWebSocketOptions {
  /** Backend JWT token */
  token: string | null;
  /** Enable/disable the WebSocket connection */
  enabled?: boolean;
}

/**
 * WebSocket hook for real-time now playing updates.
 * 
 * Connects to the backend WebSocket and receives track updates.
 * Automatically reconnects with exponential backoff + jitter.
 * 
 * @example
 * ```tsx
 * const { isConnected, error } = useWebSocket({ 
 *   token: backendToken,
 *   enabled: !!backendToken 
 * });
 * ```
 */
export function useWebSocket({ token, enabled = true }: UseWebSocketOptions): WebSocketState {
  const store = usePlayerStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  const connect = useCallback(() => {
    if (!token || !enabled) return;

    // Clear any pending reconnect
    if (reconnectTimeout.current) {
      clearTimeout(reconnectTimeout.current);
      reconnectTimeout.current = null;
    }

    setState(s => ({ ...s, isConnecting: true, error: null }));

    // Token in query param - validated BEFORE server accepts connection
    const url = `${WS_URL}/ws/now-playing?token=${encodeURIComponent(token)}`;
    
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setState({ isConnected: true, isConnecting: false, error: null });
        reconnectAttempts.current = 0;
        store.setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('[WebSocket] Failed to parse message:', e);
        }
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Closed: ${event.code} ${event.reason}`);
        setState(s => ({ ...s, isConnected: false, isConnecting: false }));
        wsRef.current = null;

        // Don't reconnect on auth failure
        if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
          setState(s => ({ ...s, error: event.reason || 'Authentication failed' }));
          store.setError('unauthorized');
          return;
        }

        // Exponential backoff with jitter to prevent thundering herd
        const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        const jitter = Math.random() * 5000;
        const delay = baseDelay + jitter;

        console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms...`);
        reconnectAttempts.current++;
        
        reconnectTimeout.current = setTimeout(connect, delay);
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        // onclose will be called after this
      };

    } catch (e) {
      console.error('[WebSocket] Failed to create connection:', e);
      setState({ isConnected: false, isConnecting: false, error: 'Connection failed' });
    }
  }, [token, enabled, store]);

  const handleMessage = useCallback((message: { type: string; data?: Record<string, unknown>; error?: string }) => {
    switch (message.type) {
      case 'connected':
        console.log('[WebSocket] Authenticated as:', (message.data as { user_id?: string })?.user_id);
        break;

      case 'track_update':
        if (message.data) {
          const data = message.data as {
            track?: {
              id: string;
              name: string;
              artist: string;
              artistId: string;
              albumName: string;
              albumArt: string;
              duration: number;
              popularity?: number;
              previewUrl?: string | null;
            };
            audio_features?: {
              id: string;
              energy: number;
              tempo: number;
              valence: number;
              danceability: number;
              loudness: number;
              acousticness: number;
              instrumentalness: number;
              liveness: number;
              speechiness: number;
              key: number;
              mode: number;
              time_signature: number;
              duration_ms: number;
            };
            progress_ms?: number;
            duration_ms?: number;
            is_playing?: boolean;
          };
          
          if (data.track) {
            // Map to frontend Track format
            store.setCurrentTrack({
              id: data.track.id,
              name: data.track.name,
              artist: data.track.artist,
              artistId: data.track.artistId,
              albumName: data.track.albumName,
              albumArt: data.track.albumArt,
              duration: data.track.duration,
              popularity: data.track.popularity ?? 0,
              previewUrl: data.track.previewUrl ?? null,
            });
          }
          
          if (data.audio_features) {
            store.setAudioFeatures(data.audio_features);
          }
          
          store.setProgress(data.progress_ms ?? 0);
          store.setDuration(data.duration_ms ?? 0);
          store.setIsPlaying(data.is_playing ?? false);
          store.setIsLoading(false);
          store.setLastSyncTime(Date.now());
        }
        break;

      case 'progress_update':
        if (message.data) {
          const data = message.data as { progress_ms?: number; is_playing?: boolean };
          store.setProgress(data.progress_ms ?? 0);
          store.setIsPlaying(data.is_playing ?? false);
        }
        break;

      case 'nothing_playing':
        store.setCurrentTrack(null);
        store.setIsPlaying(false);
        store.setAudioFeatures(null);
        store.setProgress(0);
        store.setDuration(0);
        store.setIsLoading(false);
        break;

      case 'rate_limited':
        console.warn('[WebSocket] Rate limited:', message.data);
        store.setError('syncing');
        break;

      case 'error':
        console.error('[WebSocket] Server error:', message.error);
        if (message.error === 'TOKEN_REFRESH_FAILED') {
          store.setError('unauthorized');
        } else {
          store.setError(message.error || 'Unknown error');
        }
        break;

      case 'pong':
        // Keep-alive response, ignore
        break;

      default:
        console.log('[WebSocket] Unknown message type:', message.type);
    }
  }, [store]);

  // Connect when token is available
  useEffect(() => {
    if (enabled && token) {
      connect();
    }

    return () => {
      // Cleanup on unmount or token change
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
    };
  }, [connect, enabled, token]);

  // Visibility-aware reconnection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled && token && !state.isConnected && !state.isConnecting) {
        console.log('[WebSocket] Tab visible, reconnecting...');
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [connect, enabled, token, state.isConnected, state.isConnecting]);

  return state;
}

