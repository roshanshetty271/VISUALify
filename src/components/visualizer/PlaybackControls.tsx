'use client';

import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useIsPlaying, useCurrentTrack } from '@/stores';

export function PlaybackControls() {
  const { togglePlayPause, next, previous, isLoading, error } = usePlaybackControls();
  const isPlaying = useIsPlaying();
  const currentTrack = useCurrentTrack();

  if (!currentTrack) return null;

  return (
    <div className="flex items-center gap-1">
      {/* Error toast */}
      {error && (
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-red-500/90 text-white text-xs rounded-lg whitespace-nowrap z-50">
          {error}
        </div>
      )}

      {/* Previous */}
      <button
        onClick={previous}
        disabled={isLoading}
        className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
        title="Previous track"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
        </svg>
      </button>

      {/* Play/Pause */}
      <button
        onClick={togglePlayPause}
        disabled={isLoading}
        className={`
          p-3 rounded-full transition-all
          ${isPlaying 
            ? 'bg-white text-black hover:scale-105' 
            : 'bg-spotify-green text-black hover:scale-105 hover:bg-spotify-green-light'
          }
          disabled:opacity-50
        `}
        title={isPlaying ? 'Pause' : 'Play'}
      >
        {isLoading ? (
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        ) : isPlaying ? (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </button>

      {/* Next */}
      <button
        onClick={next}
        disabled={isLoading}
        className="p-2 text-white/70 hover:text-white transition-colors disabled:opacity-50"
        title="Next track"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
        </svg>
      </button>
    </div>
  );
}

