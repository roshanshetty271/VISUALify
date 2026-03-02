// src/hooks/useWebSocket.ts
'use client';

import { useEffect, useRef, useState } from 'react';
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
  // Use getState() to avoid re-renders from store changes
  const storeRef = useRef(usePlayerStore.getState());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);
  const isConnectingRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const [state, setState] = useState<WebSocketState>({
    isConnected: false,
    isConnecting: false,
    error: null,
  });

  // Keep store ref updated
  useEffect(() => {
    return usePlayerStore.subscribe((state) => {
      storeRef.current = state;
    });
  }, []);

  // Main connection effect - only depends on token and enabled
  useEffect(() => {
    isMountedRef.current = true;
    
    const connect = () => {
      // Guard: Don't connect if disabled or no token
      if (!token || !enabled) return;
      
      // Guard: Don't create duplicate connections
      if (isConnectingRef.current) {
        console.log('[WebSocket] Already connecting, skipping...');
        return;
      }
      
      // Guard: Already connected
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        console.log('[WebSocket] Already connected, skipping...');
        return;
      }

      // Close any existing connection first
      if (wsRef.current) {
        console.log('[WebSocket] Closing existing connection before reconnect');
        wsRef.current.onclose = null; // Prevent triggering reconnect
        wsRef.current.close(1000, 'Reconnecting');
        wsRef.current = null;
      }

      // Clear any pending reconnect
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }

      isConnectingRef.current = true;
      setState(s => ({ ...s, isConnecting: true, error: null }));

      // Token in query param - validated BEFORE server accepts connection
      const url = `${WS_URL}/ws/now-playing?token=${encodeURIComponent(token)}`;
      
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMountedRef.current) {
            ws.close(1000, 'Component unmounted');
            return;
          }
          console.log('[WebSocket] Connected');
          isConnectingRef.current = false;
          setState({ isConnected: true, isConnecting: false, error: null });
          reconnectAttempts.current = 0;
          storeRef.current.setError(null);
        };

        ws.onmessage = (event) => {
          if (!isMountedRef.current) return;
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (e) {
            console.error('[WebSocket] Failed to parse message:', e);
          }
        };

        ws.onclose = (event) => {
          if (!isMountedRef.current) return;
          
          console.log(`[WebSocket] Closed: ${event.code} ${event.reason}`);
          isConnectingRef.current = false;
          setState(s => ({ ...s, isConnected: false, isConnecting: false }));
          wsRef.current = null;

          // Don't reconnect on intentional close or auth failure
          if (event.code === 1000) {
            console.log('[WebSocket] Clean close, not reconnecting');
            return;
          }
          
          if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
            setState(s => ({ ...s, error: event.reason || 'Authentication failed' }));
            storeRef.current.setError('unauthorized');
            return;
          }

          // Exponential backoff with jitter to prevent thundering herd
          const baseDelay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          const jitter = Math.random() * 2000;
          const delay = baseDelay + jitter;

          console.log(`[WebSocket] Reconnecting in ${Math.round(delay)}ms (attempt ${reconnectAttempts.current + 1})...`);
          reconnectAttempts.current++;
          
          reconnectTimeout.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, delay);
        };

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          // onclose will be called after this
        };

      } catch (e) {
        console.error('[WebSocket] Failed to create connection:', e);
        isConnectingRef.current = false;
        setState({ isConnected: false, isConnecting: false, error: 'Connection failed' });
      }
    };

    const handleMessage = (message: { type: string; data?: Record<string, unknown>; error?: string }) => {
      const store = storeRef.current;
      
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
        case 'ping':
          // Keep-alive messages, ignore
          break;

        default:
          console.log('[WebSocket] Unknown message type:', message.type);
      }
    };

    // Connect on mount or token/enabled change
    if (enabled && token) {
      connect();
    }

    // Visibility handler
    const handleVisibilityChange = () => {
      if (!document.hidden && enabled && token && !wsRef.current && !isConnectingRef.current) {
        console.log('[WebSocket] Tab visible, reconnecting...');
        reconnectAttempts.current = 0; // Reset on visibility change
        connect();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup on unmount or dependencies change
    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if (wsRef.current) {
        wsRef.current.onclose = null; // Prevent reconnect on cleanup
        wsRef.current.close(1000, 'Component unmounted');
        wsRef.current = null;
      }
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
        reconnectTimeout.current = null;
      }
      isConnectingRef.current = false;
    };
  }, [token, enabled]); // Only re-run when token or enabled changes

  return state;
}

