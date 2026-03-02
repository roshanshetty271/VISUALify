'use client';

import type { MusicPhase } from '@/types/stats';
import Image from 'next/image';

interface MusicPhasesProps {
  phases: MusicPhase[];
  isLoading?: boolean;
}

/**
 * Spotify Wrapped-style music phase cards
 */
export function MusicPhases({ phases, isLoading }: MusicPhasesProps) {
  if (isLoading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Your Music Phases</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 bg-zinc-800 rounded-lg animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!phases.length) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <h3 className="text-lg font-bold mb-4">Your Music Phases</h3>
        <div className="text-center py-8">
          <p className="text-zinc-500 mb-2">Not enough data with audio features</p>
          <p className="text-sm text-zinc-600">
            Click <span className="text-[#1DB954] font-medium">&quot;Import History&quot;</span> above to fetch mood data from Spotify
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <h3 className="text-lg font-bold mb-4">Your Music Phases</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {phases.map((phase, index) => (
          <div
            key={index}
            className="rounded-lg p-6 relative overflow-hidden group hover:scale-105 transition-transform"
            style={{
              background: `linear-gradient(135deg, ${phase.moodColor}33, ${phase.moodColor}11)`,
            }}
          >
            {/* Album art */}
            {phase.topTrack.albumArt && (
              <div className="absolute top-4 right-4 w-16 h-16 rounded-md overflow-hidden opacity-40 group-hover:opacity-60 transition-opacity">
                <Image
                  src={phase.topTrack.albumArt}
                  alt={phase.topTrack.name}
                  width={64}
                  height={64}
                  className="object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div className="relative z-10">
              <div
                className="w-3 h-3 rounded-full mb-3"
                style={{ backgroundColor: phase.moodColor }}
              />
              <h4 className="text-xl font-bold mb-2">{phase.name}</h4>
              <p className="text-sm text-zinc-400 mb-3">{phase.topGenre}</p>

              <div className="text-xs text-zinc-500 space-y-1">
                <div>{phase.trackCount} tracks</div>
                <div className="truncate">
                  Top: {phase.topTrack.name} - {phase.topTrack.artist}
                </div>
              </div>

              {/* Mood indicators */}
              <div className="mt-4 flex gap-2 text-xs">
                <span className="px-2 py-1 bg-black/20 rounded">
                  Energy: {Math.round(phase.avgEnergy * 100)}%
                </span>
                <span className="px-2 py-1 bg-black/20 rounded">
                  Mood: {Math.round(phase.avgValence * 100)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

