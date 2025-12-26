'use client';

import { useCurrentTrack, useAudioFeatures } from '@/stores';
import { ProgressBar } from './ProgressBar';
import { PlaybackControls } from './PlaybackControls';
import Image from 'next/image';

export function NowPlaying() {
  const track = useCurrentTrack();
  const features = useAudioFeatures();

  if (!track) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-8 text-gray-500">
        <span className="text-4xl">🎵</span>
        <p className="text-sm">Play something on Spotify to visualize</p>
        <p className="text-xs text-gray-600">Then click the Sync button above</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        {/* Album Art */}
        {track.albumArt && (
          <div className="relative w-16 h-16 flex-shrink-0">
            <Image
              src={track.albumArt}
              alt={track.albumName}
              fill
              className="rounded-xl object-cover shadow-lg"
            />
          </div>
        )}

        {/* Track Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-white text-lg truncate">
            {track.name}
          </h3>
          <p className="text-gray-400 truncate">{track.artist}</p>
          
          {/* Audio Features - smaller on mobile */}
          {features && (
            <div className="hidden sm:flex gap-4 mt-1 font-mono text-xs">
              <div className="flex items-center gap-1">
                <span className="text-[var(--theme-primary)]">⚡</span>
                <span className="text-gray-500">{Math.round(features.energy * 100)}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--theme-primary)]">♫</span>
                <span className="text-gray-500">{Math.round(features.tempo)} BPM</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-[var(--theme-primary)]">☺</span>
                <span className="text-gray-500">{Math.round(features.valence * 100)}%</span>
              </div>
            </div>
          )}
        </div>

        {/* Playback Controls */}
        <div className="flex-shrink-0 relative">
          <PlaybackControls />
        </div>
      </div>

      {/* Progress Bar */}
      <ProgressBar />
    </div>
  );
}
