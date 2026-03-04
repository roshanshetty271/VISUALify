'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useNowPlaying, useRecentTracks, useBPM } from '@/hooks';
import { useIsLoading, useCurrentTrack } from '@/stores';
import { useThemeStore } from '@/stores/useThemeStore';
import { BeatCanvasMode } from './BeatCanvasMode';
import { LyricsMode } from './LyricsMode';
import { PianoMode } from './PianoMode';
import { NowPlaying } from './NowPlaying';
import { ModeSelector, VisualizationMode } from './ModeSelector';
import { PlaylistQueue, QueueButton } from './PlaylistQueue';
import { LoadingSpinner } from '@/components/ui';
import { FullscreenButton } from '@/components/ui/FullscreenButton';
import { SyncButton } from '@/components/ui/SyncButton';
import { DevicePicker } from '@/components/ui/DevicePicker';
import { ThemeSelector } from '@/components/ui/ThemeSelector';

export function VisualizerContainer() {
  const [mode, setMode] = useState<VisualizationMode>('lyrics');
  const [queueOpen, setQueueOpen] = useState(false);

  const { forceSync } = useNowPlaying();
  useRecentTracks();
  useBPM();

  const isLoading = useIsLoading();
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
      case 'canvas':
        return <BeatCanvasMode />;
      case 'lyrics':
        return <LyricsMode />;
      case 'piano':
        return <PianoMode />;
      default:
        return <LyricsMode />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--theme-bg-start)]">
      {/* ─── Unified Toolbar ─── */}
      <div className="absolute top-0 left-0 right-0 z-30 pointer-events-none">
        <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-2 px-4 py-2.5 mx-3 mt-3 bg-black/40 backdrop-blur-2xl rounded-2xl border border-white/[0.06] shadow-[0_8px_32px_rgba(0,0,0,0.4)] pointer-events-auto overflow-x-auto no-scrollbar">
          {/* Left: Queue + Logo + Nav */}
          <div className="flex items-center gap-2 shrink-0">
            <QueueButton onClick={() => setQueueOpen(true)} />
            <Link href="/visualizer" className="text-lg font-display font-bold">
              <span className="text-white">VISUAL</span>
              <span className="text-[var(--theme-primary)]" style={{ filter: 'drop-shadow(0 0 8px var(--theme-primary))' }}>ify</span>
            </Link>
            <div className="w-px h-5 bg-white/10 hidden sm:block" />
            <div className="hidden sm:flex items-center gap-1">
              <Link
                href="/dashboard"
                className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-all"
              >
                Dashboard
              </Link>
            </div>
          </div>

          {/* Center: Mode Selector */}
          <div className="hidden lg:flex justify-center flex-1 min-w-[200px]">
            <ModeSelector currentMode={mode} onModeChange={setMode} />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <div className="mr-2">
              <ThemeSelector />
            </div>
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg">
              <DevicePicker />
              <SyncButton onSync={forceSync} />
            </div>
            <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-lg ml-1">
              <FullscreenButton />
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
      <div className="flex-1 relative min-h-0 overflow-hidden">
        {renderVisualization()}
      </div>

      {/* ─── Idle Prompt (when no track playing) ─── */}
      {!currentTrack && (
        <div className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-[fadeInUp_0.6s_ease-out]">
          <div className="flex items-center gap-3 px-5 py-3 rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1]" style={{ boxShadow: '0 0 40px color-mix(in srgb, var(--theme-primary) 8%, transparent)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'color-mix(in srgb, var(--theme-primary) 20%, transparent)' }}>
              <svg className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
              </svg>
            </div>
            <span className="text-white/70 text-sm">Play something on Spotify</span>
            <button
              onClick={forceSync}
              className="px-4 py-1.5 rounded-full text-black text-xs font-semibold transition-all ml-1"
              style={{ backgroundColor: 'var(--theme-primary)' }}
            >
              Sync
            </button>
          </div>
        </div>
      )}

      {/* ─── Now Playing Bar ─── */}
      {currentTrack && (
        <div
          className="relative z-10 p-4 shrink-0 transition-colors duration-500"
          style={{
            background: 'linear-gradient(to top, color-mix(in srgb, var(--theme-primary) 15%, black), color-mix(in srgb, var(--theme-primary) 5%, black) 60%, transparent)'
          }}
        >
          <NowPlaying />
        </div>
      )}

      {/* ─── Panels ─── */}
      <PlaylistQueue isOpen={queueOpen} onClose={() => setQueueOpen(false)} />
    </div>
  );
}
