'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { useCurrentTrack, useRecentTracks } from '@/stores';

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlaylistQueue({ isOpen, onClose }: QueuePanelProps) {
  const currentTrack = useCurrentTrack();
  const recentTracks = useRecentTracks();
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const dedupedRecentTracks = useMemo(
    () => recentTracks.filter((track, index, arr) => arr.findIndex((t) => t.id === track.id) === index),
    [recentTracks]
  );

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className="fixed left-0 top-0 h-full w-80 bg-[#0f0f18]/95 backdrop-blur-xl 
                   border-r border-white/10 z-50 overflow-y-auto
                   animate-in slide-in-from-left duration-300"
        style={{
          animation: 'slideInFromLeft 0.3s ease-out forwards',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-[#0f0f18]/90 backdrop-blur-sm p-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-display font-bold text-white">Queue</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Now Playing */}
        {currentTrack && (
          <div className="p-4 border-b border-white/10">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Now Playing</p>
            <div className="flex items-center gap-3">
              {currentTrack.albumArt && !failedImages[currentTrack.albumArt] ? (
                <div className="relative w-14 h-14 flex-shrink-0">
                  <Image
                    src={currentTrack.albumArt}
                    alt={currentTrack.albumName || 'Album Art'}
                    width={56}
                    height={56}
                    className="rounded-lg object-cover"
                    loading="lazy"
                    onError={() => {
                      setFailedImages((prev) => ({
                        ...prev,
                        [currentTrack.albumArt!]: true,
                      }));
                    }}
                  />
                  <div className="absolute inset-0 rounded-lg ring-2 ring-[var(--theme-primary)]/50" />
                </div>
              ) : (
                <div className="w-14 h-14 flex-shrink-0 rounded-lg bg-zinc-800/80 border border-white/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-zinc-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 016.85 5.54 4.99 4.99 0 00-6.8 4.63v3.43A7 7 0 0112 5zm2 10.17a3 3 0 113.43 2.97v-2.97h-3.43zM11 8h2v7.17a5 5 0 00-2 3.99V8z" />
                  </svg>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium truncate">{currentTrack.name}</p>
                <p className="text-gray-500 text-sm truncate">{currentTrack.artist}</p>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="w-0.5 bg-[var(--theme-primary)] rounded-full animate-wave"
                    style={{
                      height: `${8 + i * 3}px`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Tracks */}
        <div className="p-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Recently Played</p>
          <div className="space-y-2">
            {dedupedRecentTracks.slice(0, 15).map((track, index) => (
              <div
                key={`${track.id}-${index}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group"
              >
                <span className="w-5 text-center text-gray-600 text-sm font-mono">
                  {index + 1}
                </span>
                {track.albumArt && !failedImages[track.albumArt] ? (
                  <div className="relative w-10 h-10 flex-shrink-0">
                    <Image
                      src={track.albumArt}
                      alt={track.albumName || 'Album Art'}
                      width={40}
                      height={40}
                      className="rounded object-cover"
                      loading="lazy"
                      onError={() => {
                        setFailedImages((prev) => ({
                          ...prev,
                          [track.albumArt!]: true,
                        }));
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 flex-shrink-0 rounded bg-zinc-800/80 border border-white/10 flex items-center justify-center">
                    <svg className="w-4 h-4 text-zinc-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 2a7 7 0 016.85 5.54 4.99 4.99 0 00-6.8 4.63v3.43A7 7 0 0112 5zm2 10.17a3 3 0 113.43 2.97v-2.97h-3.43zM11 8h2v7.17a5 5 0 00-2 3.99V8z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-white/90 text-sm truncate group-hover:text-white">
                    {track.name}
                  </p>
                  <p className="text-gray-500 text-xs truncate">{track.artist}</p>
                </div>
              </div>
            ))}
          </div>

          {dedupedRecentTracks.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-8">
              No recent tracks yet
            </p>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInFromLeft {
          from {
            transform: translateX(-100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}

export function QueueButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="p-1.5 rounded-md hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-all duration-200"
      title="Queue"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6h16M4 10h16M4 14h16M4 18h16"
        />
      </svg>
    </button>
  );
}

