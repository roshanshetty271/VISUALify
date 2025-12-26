import { create } from 'zustand';
import type { Track, AudioFeatures } from '@/types';

interface PlayerState {
  currentTrack: Track | null;
  audioFeatures: AudioFeatures | null;
  recentTracks: Track[];
  isPlaying: boolean;
  isLoading: boolean;
  isSyncing: boolean;    // Manual sync in progress
  lastSyncTime: number;  // Timestamp of last successful sync
  error: string | null;
  progress: number;      // Current position in ms
  duration: number;      // Total track length in ms
}

interface PlayerActions {
  setCurrentTrack: (track: Track | null) => void;
  setAudioFeatures: (features: AudioFeatures | null) => void;
  setRecentTracks: (tracks: Track[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  setError: (error: string | null) => void;
  setProgress: (progress: number) => void;
  setDuration: (duration: number) => void;
  incrementProgress: (amount: number) => void;
  reset: () => void;
}

const initialState: PlayerState = {
  currentTrack: null,
  audioFeatures: null,
  recentTracks: [],
  isPlaying: false,
  isLoading: true,
  isSyncing: false,
  lastSyncTime: 0,
  error: null,
  progress: 0,
  duration: 0,
};

export const usePlayerStore = create<PlayerState & PlayerActions>((set) => ({
  ...initialState,

  setCurrentTrack: (track) => set({ currentTrack: track }),
  setAudioFeatures: (features) => set({ audioFeatures: features }),
  setRecentTracks: (tracks) => set({ recentTracks: tracks }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  setLastSyncTime: (time) => set({ lastSyncTime: time }),
  setError: (error) => set({ error }),
  setProgress: (progress) => set({ progress }),
  setDuration: (duration) => set({ duration }),
  incrementProgress: (amount) => set((state) => ({ 
    progress: Math.min(state.progress + amount, state.duration) 
  })),
  reset: () => set(initialState),
}));

// Selector hooks for performance (avoids subscribing to entire store)
export const useCurrentTrack = () => usePlayerStore((s) => s.currentTrack);
export const useAudioFeatures = () => usePlayerStore((s) => s.audioFeatures);
export const useRecentTracks = () => usePlayerStore((s) => s.recentTracks);
export const useIsPlaying = () => usePlayerStore((s) => s.isPlaying);
export const useIsLoading = () => usePlayerStore((s) => s.isLoading);
export const useIsSyncing = () => usePlayerStore((s) => s.isSyncing);
export const useLastSyncTime = () => usePlayerStore((s) => s.lastSyncTime);
export const usePlayerError = () => usePlayerStore((s) => s.error);
export const useProgress = () => usePlayerStore((s) => s.progress);
export const useDuration = () => usePlayerStore((s) => s.duration);

export const usePlayerActions = () =>
  usePlayerStore((s) => ({
    setCurrentTrack: s.setCurrentTrack,
    setAudioFeatures: s.setAudioFeatures,
    setRecentTracks: s.setRecentTracks,
    setIsPlaying: s.setIsPlaying,
    setIsLoading: s.setIsLoading,
    setIsSyncing: s.setIsSyncing,
    setLastSyncTime: s.setLastSyncTime,
    setError: s.setError,
    setProgress: s.setProgress,
    setDuration: s.setDuration,
    incrementProgress: s.incrementProgress,
    reset: s.reset,
  }));
