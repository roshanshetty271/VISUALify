'use client';

import { useCurrentTrack, useAudioFeatures } from '@/stores';
import { ProgressBar } from './ProgressBar';
import { PlaybackControls } from './PlaybackControls';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export function NowPlaying() {
  const track = useCurrentTrack();
  const features = useAudioFeatures();
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [track?.id, track?.albumArt]);

  if (!track) return null;

  const showAlbumArt = Boolean(track.albumArt) && !imageError;

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-white/[0.05] backdrop-blur-xl rounded-xl border border-white/[0.07] max-w-2xl mx-auto">
      <div className="flex items-center gap-3.5">
        {showAlbumArt ? (
          <div className="relative w-14 h-14 flex-shrink-0">
            <Image
              src={track.albumArt}
              alt={track.albumName}
              fill
              className="rounded-lg object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center">
            <svg className="w-6 h-6 text-zinc-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 016.85 5.54 4.99 4.99 0 00-6.8 4.63v3.43A7 7 0 0112 5zm2 10.17a3 3 0 113.43 2.97v-2.97h-3.43zM11 8h2v7.17a5 5 0 00-2 3.99V8z" />
            </svg>
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
