'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useNowPlaying, useRecentTracks, useBPM } from '@/hooks';
import { useIsLoading, useCurrentTrack } from '@/stores';
import { useThemeStore } from '@/stores/useThemeStore';
import { PulseMode } from './PulseMode';
import { GalaxyMode } from './GalaxyMode';
import { ParticlesMode } from './ParticlesMode';
import { NowPlaying } from './NowPlaying';
import { ModeSelector, VisualizationMode } from './ModeSelector';
import { PlaylistQueue, QueueButton } from './PlaylistQueue';
import { LoadingSpinner } from '@/components/ui';
import { SettingsPanel } from '@/components/ui/SettingsPanel';
import { SettingsButton } from '@/components/ui/SettingsButton';
import { FullscreenButton } from '@/components/ui/FullscreenButton';
import { SyncButton } from '@/components/ui/SyncButton';
import { DevicePicker } from '@/components/ui/DevicePicker';

export function VisualizerContainer() {
  const [mode, setMode] = useState<VisualizationMode>('pulse');
  const [queueOpen, setQueueOpen] = useState(false);

  const { forceSync } = useNowPlaying();
  useRecentTracks();
  useBPM();

  const isLoading = useIsLoading();
  usePlayerError();
  const currentTrack = useCurrentTrack();

  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.currentTheme);

  useEffect(() => {
    setTheme(currentTheme);
  }, [setTheme, currentTheme]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[var(--theme-bg-start)]">
        <LoadingSpinner size="lg" />
        <p className="text-zinc-500 text-sm">Connecting to Spotify...</p>
      </div>
    );
  }

  const renderVisualization = () => {
    switch (mode) {
      case 'pulse':
        return <PulseMode />;
      case 'orbit':
        return <GalaxyMode />;
      case 'particles':
        return <ParticlesMode />;
      default:
        return <PulseMode />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--theme-bg-start)]">
      {/* ─── Unified Toolbar ─── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex items-center justify-between px-4 py-3 mx-3 mt-3 bg-black/60 backdrop-blur-2xl rounded-2xl border border-white/[0.08] shadow-2xl pointer-events-auto">
          {/* Left: Queue + Logo + Nav */}
          <div className="flex items-center gap-2">
            <QueueButton onClick={() => setQueueOpen(true)} />
            <Link href="/visualizer" className="text-lg font-display font-bold">
              <span className="text-white">VISUAL</span>
              <span className="text-[#1DB954]">ify</span>
            </Link>
            <div className="w-px h-5 bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Dashboard
              </Link>
              <Link
                href="/mood-journey"
                className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Mood
              </Link>
            </div>
          </div>

          {/* Center: Mode Selector */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2">
            <ModeSelector currentMode={mode} onModeChange={setMode} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1">
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg">
              <DevicePicker />
              <SyncButton onSync={forceSync} />
            </div>
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg ml-1">
              <FullscreenButton />
              <SettingsButton />
            </div>
            <div className="w-px h-5 bg-white/10 mx-1.5 hidden sm:block" />
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="hidden sm:block px-3 py-1.5 rounded-md text-xs text-zinc-500 hover:text-white hover:bg-white/[0.08] transition-all"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile mode selector */}
        <div className="md:hidden flex justify-center mt-2 pointer-events-auto">
          <ModeSelector currentMode={mode} onModeChange={setMode} />
        </div>
      </div>

      {/* ─── Visualization Area ─── */}
      <div className="flex-1 relative">
        {renderVisualization()}
      </div>

      {/* ─── Idle Overlay (when no track playing) ─── */}
      {!currentTrack && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
          <div className="text-center px-10 py-10 rounded-2xl bg-black/50 backdrop-blur-xl border border-white/[0.08]">
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center">
              <svg className="w-7 h-7 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <p className="text-white text-base font-semibold mb-1">Play something on Spotify</p>
            <p className="text-zinc-400 text-sm">The visualization will react in real-time</p>
            <button
              onClick={forceSync}
              className="mt-5 px-5 py-2 rounded-lg bg-[#1DB954] text-black text-sm font-semibold hover:bg-[#1ed760] transition-colors"
            >
              Sync now
            </button>
          </div>
        </div>
      )}

      {/* ─── Now Playing Bar ─── */}
      {currentTrack && (
        <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
          <NowPlaying />
        </div>
      )}

      {/* ─── Panels ─── */}
      <PlaylistQueue isOpen={queueOpen} onClose={() => setQueueOpen(false)} />
      <SettingsPanel />
    </div>
  );
}
