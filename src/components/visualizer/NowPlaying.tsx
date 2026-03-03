'use client';

import { useCurrentTrack, useAudioFeatures } from '@/stores';
import { ProgressBar } from './ProgressBar';
import { PlaybackControls } from './PlaybackControls';
import Image from 'next/image';

export function NowPlaying() {
  const track = useCurrentTrack();
  const features = useAudioFeatures();

  if (!track) return null;

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-white/[0.05] backdrop-blur-xl rounded-xl border border-white/[0.07] max-w-2xl mx-auto">
      <div className="flex items-center gap-3.5">
        {track.albumArt && (
          <div className="relative w-14 h-14 flex-shrink-0">
            <Image
              src={track.albumArt}
              alt={track.albumName}
              fill
              className="rounded-lg object-cover"
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white text-sm truncate">
            {track.name}
          </h3>
          <p className="text-zinc-500 text-xs truncate">{track.artist}</p>
          {features && (
            <div className="hidden sm:flex gap-3 mt-1 font-mono text-[10px] text-zinc-600">
              <span>{Math.round(features.energy * 100)}% energy</span>
              <span>{Math.round(features.tempo)} bpm</span>
              <span>{Math.round(features.valence * 100)}% valence</span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 relative">
          <PlaybackControls />
        </div>
      </div>

      <ProgressBar />
    </div>
  );
}
