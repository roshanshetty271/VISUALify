'use client';

import { useState, useEffect } from 'react';
import { useNowPlaying, useRecentTracks, useBPM } from '@/hooks';
import { useIsLoading, usePlayerError } from '@/stores';
import { useThemeStore } from '@/stores/useThemeStore';
import { GalaxyMode } from './GalaxyMode';
import { TerrainMode } from './TerrainMode';
import { NeuralMode } from './NeuralMode';
import { RiverMode } from './RiverMode';
import { WaveformMode } from './WaveformMode';
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
  const [mode, setMode] = useState<VisualizationMode>('galaxy');
  const [queueOpen, setQueueOpen] = useState(false);

  // Initialize hooks - get forceSync function
  const { forceSync } = useNowPlaying();
  useRecentTracks();
  useBPM();

  const isLoading = useIsLoading();
  const error = usePlayerError();

  // Apply theme on mount
  const setTheme = useThemeStore((s) => s.setTheme);
  const currentTheme = useThemeStore((s) => s.currentTheme);
  
  useEffect(() => {
    // Re-apply theme CSS variables on mount
    setTheme(currentTheme);
  }, [setTheme, currentTheme]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 bg-[var(--theme-bg-start)]">
        <LoadingSpinner size="lg" />
        <p className="text-gray-400 font-display">Connecting to Spotify...</p>
      </div>
    );
  }

  const renderVisualization = () => {
    switch (mode) {
      case 'galaxy':
        return <GalaxyMode />;
      case 'terrain':
        return <TerrainMode />;
      case 'neural':
        return <NeuralMode />;
      case 'river':
        return <RiverMode />;
      case 'waveform':
        return <WaveformMode />;
      case 'particles':
        return <ParticlesMode />;
      default:
        return <GalaxyMode />;
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[var(--theme-bg-start)]">
      {/* Top Controls */}
      <div className="absolute top-20 left-4 z-20 flex items-center gap-2">
        <QueueButton onClick={() => setQueueOpen(true)} />
      </div>

      <div className="absolute top-20 right-4 z-20 flex items-center gap-2">
        <DevicePicker />
        <SyncButton onSync={forceSync} />
        <FullscreenButton />
        <SettingsButton />
      </div>

      {/* Mode Selector - Centered at top */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20">
        <ModeSelector currentMode={mode} onModeChange={setMode} />
      </div>

      {/* Visualization Area */}
      <div className="flex-1 relative pt-16">
        {renderVisualization()}
      </div>

      {/* Now Playing Bar */}
      <div className="relative z-10 p-4 bg-gradient-to-t from-black/80 via-black/50 to-transparent">
        <NowPlaying />
      </div>

      {/* Panels */}
      <PlaylistQueue isOpen={queueOpen} onClose={() => setQueueOpen(false)} />
      <SettingsPanel />
    </div>
  );
}
