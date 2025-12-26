'use client';

import { useEffect } from 'react';
import { useAudioFeatures, useIsPlaying } from '@/stores';

export function useBPM() {
  const audioFeatures = useAudioFeatures();
  const isPlaying = useIsPlaying();

  useEffect(() => {
    if (audioFeatures?.tempo) {
      const bpm = audioFeatures.tempo;
      const pulseDuration = 60 / bpm; // seconds per beat (e.g., 120 BPM = 0.5s)
      const orbitDuration = (60 / bpm) * 8; // 8 beats per orbit

      document.documentElement.style.setProperty('--pulse-duration', `${pulseDuration}s`);
      document.documentElement.style.setProperty('--orbit-duration', `${orbitDuration}s`);
      document.documentElement.style.setProperty('--bpm', String(Math.round(bpm)));
      
      // Also set energy-based variables
      if (audioFeatures.energy !== undefined) {
        document.documentElement.style.setProperty('--energy', String(audioFeatures.energy));
        document.documentElement.style.setProperty('--glow-intensity', String(0.5 + audioFeatures.energy * 0.5));
      }
    } else {
      // Default values when no track
      document.documentElement.style.setProperty('--pulse-duration', '1s');
      document.documentElement.style.setProperty('--orbit-duration', '8s');
      document.documentElement.style.setProperty('--bpm', '60');
      document.documentElement.style.setProperty('--energy', '0.5');
      document.documentElement.style.setProperty('--glow-intensity', '0.75');
    }

    // Pause animations when not playing (handled by CSS animation-play-state)
    document.documentElement.style.setProperty(
      '--animation-play-state', 
      isPlaying ? 'running' : 'paused'
    );
  }, [audioFeatures?.tempo, audioFeatures?.energy, isPlaying]);
}

