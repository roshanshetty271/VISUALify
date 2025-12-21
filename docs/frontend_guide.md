# VISUALify - Frontend Guide

## Overview

This guide covers React patterns, component architecture, and D3.js integration for VISUALify.

---

## Component Architecture

### Server vs Client Components

**Default to Server Components** unless you need:
- `useState`, `useEffect`, or other hooks
- Event handlers (`onClick`, `onChange`)
- Browser APIs (`window`, `localStorage`)
- Third-party client libraries

```tsx
// Server Component (default) - no directive needed
// src/app/page.tsx
export default function LandingPage() {
  return (
    <main>
      <h1>VISUALify</h1>
      <p>See your sound</p>
    </main>
  );
}

// Client Component - needs directive
// src/components/visualizer/GalaxyMode.tsx
'use client';

import { useEffect, useRef } from 'react';

export function GalaxyMode() {
  const svgRef = useRef<SVGSVGElement>(null);
  // ... D3 logic
}
```

### Component Composition Pattern

Keep client components at the "leaves" of your tree:

```tsx
// Server Component (parent)
// src/app/(main)/visualizer/page.tsx
import { VisualizerContainer } from '@/components/visualizer';
import { getServerSession } from 'next-auth';

export default async function VisualizerPage() {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <main>
      <h1>Your Visualization</h1>
      {/* Client component handles interactivity */}
      <VisualizerContainer />
    </main>
  );
}
```

---

## D3.js + React Integration

### Pattern: React Renders, D3 Calculates

Let React handle the DOM, use D3 only for calculations:

```tsx
'use client';

import { useMemo } from 'react';
import * as d3 from 'd3';
import type { Track } from '@/types';

interface GalaxyModeProps {
  tracks: Track[];
  currentTrack: Track | null;
}

export function GalaxyMode({ tracks, currentTrack }: GalaxyModeProps) {
  // D3 calculates scales
  const colorScale = useMemo(
    () => d3.scaleLinear<string>()
      .domain([0, 0.5, 1])
      .range(['#3b82f6', '#22c55e', '#ef4444']),
    []
  );

  const sizeScale = useMemo(
    () => d3.scaleLinear()
      .domain([0, 1])
      .range([20, 60]),
    []
  );

  // React renders
  return (
    <svg viewBox="0 0 800 600" className="w-full h-full">
      {tracks.map((track) => (
        <circle
          key={track.id}
          cx={400}
          cy={300}
          r={sizeScale(track.energy)}
          fill={colorScale(track.energy)}
          className="transition-all duration-300"
        />
      ))}
    </svg>
  );
}
```

### Pattern: useD3 Hook for DOM Manipulation

When D3 needs direct DOM access (axes, transitions):

```tsx
// src/hooks/useD3.ts
'use client';

import { useRef, useEffect } from 'react';
import * as d3 from 'd3';

export function useD3<T extends SVGElement>(
  renderFn: (selection: d3.Selection<T, unknown, null, undefined>) => void,
  dependencies: React.DependencyList
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (ref.current) {
      renderFn(d3.select(ref.current));
    }
    // Cleanup
    return () => {
      if (ref.current) {
        d3.select(ref.current).selectAll('*').remove();
      }
    };
  }, dependencies);

  return ref;
}

// Usage
function Axis({ scale }: { scale: d3.ScaleLinear<number, number> }) {
  const ref = useD3<SVGGElement>(
    (g) => {
      g.call(d3.axisBottom(scale));
    },
    [scale]
  );

  return <g ref={ref} />;
}
```

### Pattern: Force Simulation Hook

```tsx
// src/hooks/useForceSimulation.ts
'use client';

import { useState, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import type { Track } from '@/types';

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  track: Track;
  x?: number;
  y?: number;
}

export function useForceSimulation(
  tracks: Track[],
  width: number,
  height: number
) {
  const [nodes, setNodes] = useState<SimulationNode[]>([]);

  const simulation = useMemo(
    () => d3.forceSimulation<SimulationNode>()
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('charge', d3.forceManyBody().strength(-50))
      .force('collision', d3.forceCollide().radius(30)),
    [width, height]
  );

  useEffect(() => {
    const newNodes: SimulationNode[] = tracks.map((track) => ({
      id: track.id,
      track,
    }));

    simulation.nodes(newNodes);
    simulation.alpha(1).restart();

    simulation.on('tick', () => {
      setNodes([...simulation.nodes()]);
    });

    return () => {
      simulation.stop();
    };
  }, [tracks, simulation]);

  return nodes;
}
```

---

## State Management with Zustand

### Store Pattern

```tsx
// src/stores/usePlayerStore.ts
import { create } from 'zustand';
import type { Track, AudioFeatures } from '@/types';

interface PlayerState {
  // State
  currentTrack: Track | null;
  audioFeatures: AudioFeatures | null;
  recentTracks: Track[];
  isPlaying: boolean;
  error: string | null;
  
  // Actions
  setCurrentTrack: (track: Track | null) => void;
  setAudioFeatures: (features: AudioFeatures | null) => void;
  setRecentTracks: (tracks: Track[]) => void;
  setIsPlaying: (playing: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentTrack: null,
  audioFeatures: null,
  recentTracks: [],
  isPlaying: false,
  error: null,
};

export const usePlayerStore = create<PlayerState>((set) => ({
  ...initialState,
  
  setCurrentTrack: (track) => set({ currentTrack: track }),
  setAudioFeatures: (features) => set({ audioFeatures: features }),
  setRecentTracks: (tracks) => set({ recentTracks: tracks }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setError: (error) => set({ error }),
  reset: () => set(initialState),
}));
```

### Selector Pattern (Performance)

```tsx
// Always use selectors to avoid unnecessary re-renders
function NowPlaying() {
  // ✅ Good - only subscribes to currentTrack
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  
  // ❌ Bad - subscribes to entire store
  const { currentTrack } = usePlayerStore();
  
  return <div>{currentTrack?.name}</div>;
}

// Create custom hooks for common selectors
export const useCurrentTrack = () => 
  usePlayerStore((state) => state.currentTrack);

export const useAudioFeatures = () => 
  usePlayerStore((state) => state.audioFeatures);

export const useIsPlaying = () => 
  usePlayerStore((state) => state.isPlaying);
```

---

## Custom Hooks

### useNowPlaying - Core Polling Hook

```tsx
// src/hooks/useNowPlaying.ts
'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { usePlayerStore } from '@/stores';
import { spotifyClient } from '@/lib/spotify';

const POLL_INTERVAL = 3000; // 3 seconds
const IDLE_POLL_INTERVAL = 10000; // 10 seconds when nothing playing

export function useNowPlaying() {
  const { data: session } = useSession();
  const { setCurrentTrack, setIsPlaying, setError, isPlaying } = usePlayerStore();
  const audioFeaturesCache = useRef<Map<string, AudioFeatures>>(new Map());

  const fetchNowPlaying = useCallback(async () => {
    if (!session?.accessToken) return;

    try {
      const data = await spotifyClient.getNowPlaying(session.accessToken);
      
      if (data?.item) {
        setCurrentTrack(data.item);
        setIsPlaying(data.is_playing);
        setError(null);
      } else {
        setCurrentTrack(null);
        setIsPlaying(false);
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('429')) {
        // Rate limited - back off handled by client
        console.warn('Rate limited, backing off...');
      } else {
        setError('Failed to fetch playback');
      }
    }
  }, [session?.accessToken, setCurrentTrack, setIsPlaying, setError]);

  // Visibility-aware polling
  useEffect(() => {
    if (!session?.accessToken) return;

    let intervalId: NodeJS.Timeout;
    
    const startPolling = () => {
      fetchNowPlaying();
      intervalId = setInterval(
        fetchNowPlaying,
        isPlaying ? POLL_INTERVAL : IDLE_POLL_INTERVAL
      );
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session?.accessToken, fetchNowPlaying, isPlaying]);
}
```

### useBPM - Tempo-Synced Animations

```tsx
// src/hooks/useBPM.ts
'use client';

import { useEffect } from 'react';
import { useAudioFeatures } from '@/stores';

export function useBPM() {
  const audioFeatures = useAudioFeatures();
  
  useEffect(() => {
    if (audioFeatures?.tempo) {
      const bpm = audioFeatures.tempo;
      const pulseDuration = 60 / bpm; // seconds per beat
      
      document.documentElement.style.setProperty(
        '--pulse-duration',
        `${pulseDuration}s`
      );
      document.documentElement.style.setProperty(
        '--bpm',
        String(bpm)
      );
    }
  }, [audioFeatures?.tempo]);
}
```

---

## Animation Patterns

### CSS Custom Properties for Dynamic Animations

```css
/* src/app/globals.css */
:root {
  --pulse-duration: 1s;
  --glow-color: #1DB954;
  --orbit-radius: 100px;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

@keyframes glow {
  0%, 100% { filter: drop-shadow(0 0 10px var(--glow-color)); }
  50% { filter: drop-shadow(0 0 30px var(--glow-color)); }
}

.animate-pulse-bpm {
  animation: pulse var(--pulse-duration) ease-in-out infinite;
}

.animate-glow {
  animation: glow 2s ease-in-out infinite;
}
```

### Tailwind Config for Custom Animations

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-bpm': 'pulse var(--pulse-duration, 1s) ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite',
        'orbit': 'orbit var(--orbit-duration, 10s) linear infinite',
      },
    },
  },
};
```

---

## Error Boundaries

```tsx
// src/app/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

---

## Loading States

```tsx
// src/app/loading.tsx
export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500" />
    </div>
  );
}

// Component-level loading
function VisualizerContainer() {
  const { isLoading, currentTrack } = usePlayerStore();
  
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  if (!currentTrack) {
    return <EmptyState message="Start playing on Spotify" />;
  }
  
  return <GalaxyMode track={currentTrack} />;
}
```

---

## Accessibility

### Reduced Motion

```tsx
// Check user preference
const prefersReducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
).matches;

// In Tailwind
<div className="animate-pulse motion-reduce:animate-none" />
```

### Screen Reader Announcements

```tsx
function NowPlaying({ track }: { track: Track }) {
  return (
    <>
      <div aria-live="polite" className="sr-only">
        Now playing: {track.name} by {track.artist}
      </div>
      <div className="visible-content">
        {/* Visual display */}
      </div>
    </>
  );
}
```
