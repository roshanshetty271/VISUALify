# VISUALify - File Structure

## Overview

This document defines the folder structure for VISUALify. We follow Next.js 14 App Router conventions with additional organization for scalability.

---

## Root Structure

```
visualify/
├── .cursor/
│   └── rules/              # Cursor AI rules
├── .github/
│   └── workflows/          # CI/CD workflows
├── docs/                   # Project documentation
├── public/                 # Static assets
├── src/
│   ├── app/               # Next.js App Router
│   ├── components/        # React components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   ├── stores/            # Zustand stores
│   ├── types/             # TypeScript types
│   └── styles/            # Global styles
├── .env.example           # Environment template
├── .env.local             # Local environment (gitignored)
├── .eslintrc.json         # ESLint config
├── .gitignore
├── .prettierrc            # Prettier config
├── next.config.js         # Next.js config
├── package.json
├── postcss.config.js      # PostCSS config
├── tailwind.config.js     # Tailwind config
├── tsconfig.json          # TypeScript config
└── README.md
```

---

## Detailed Structure

### `/src/app` - Next.js App Router

```
src/app/
├── api/
│   └── auth/
│       └── [...nextauth]/
│           └── route.ts        # NextAuth handler
├── (auth)/
│   └── login/
│       └── page.tsx            # Login page
├── (main)/
│   ├── layout.tsx              # Main app layout
│   └── visualizer/
│       └── page.tsx            # Main visualizer page
├── layout.tsx                  # Root layout
├── page.tsx                    # Landing page
├── loading.tsx                 # Global loading state
├── error.tsx                   # Global error boundary
├── not-found.tsx              # 404 page
└── globals.css                # Global styles
```

### `/src/components` - React Components

```
src/components/
├── ui/                         # Generic UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── LoadingSpinner.tsx
│   └── index.ts               # Barrel export
├── layout/                     # Layout components
│   ├── Header.tsx
│   ├── Footer.tsx
│   └── index.ts
├── visualizer/                 # Visualization components
│   ├── VisualizerContainer.tsx # Main container
│   ├── GalaxyMode.tsx          # Galaxy visualization
│   ├── TerrainMode.tsx         # Terrain visualization
│   ├── NeuralMode.tsx          # Neural visualization
│   ├── RiverMode.tsx           # River visualization
│   ├── ModeSelector.tsx        # Mode switching UI
│   ├── NowPlaying.tsx          # Current track display
│   ├── TrackNode.tsx           # Individual track node
│   └── index.ts
├── auth/                       # Auth components
│   ├── LoginButton.tsx
│   ├── LogoutButton.tsx
│   ├── SessionProvider.tsx
│   └── index.ts
└── providers/                  # Context providers
    ├── Providers.tsx           # Combined providers
    └── index.ts
```

### `/src/hooks` - Custom Hooks

```
src/hooks/
├── useNowPlaying.ts           # Poll current track
├── useAudioFeatures.ts        # Fetch audio features
├── useRecentTracks.ts         # Fetch recent tracks
├── useD3.ts                   # D3 integration hook
├── useForceSimulation.ts      # D3 force simulation
├── usePolling.ts              # Generic polling hook
├── useVisibilityAware.ts      # Page Visibility API
├── useBPM.ts                  # BPM-synced animations
└── index.ts
```

### `/src/lib` - Utilities

```
src/lib/
├── spotify/
│   ├── client.ts              # Spotify API client
│   ├── auth.ts                # Auth helpers
│   ├── types.ts               # Spotify API types
│   └── index.ts
├── utils/
│   ├── colors.ts              # Color mapping functions
│   ├── scales.ts              # D3 scale helpers
│   ├── audio.ts               # Audio feature utilities
│   └── index.ts
├── constants.ts               # App constants
└── config.ts                  # Runtime config
```

### `/src/stores` - Zustand Stores

```
src/stores/
├── usePlayerStore.ts          # Player state
├── useVisualizerStore.ts      # Visualizer settings
├── useUIStore.ts              # UI state (modals, etc.)
└── index.ts
```

### `/src/types` - TypeScript Types

```
src/types/
├── spotify.ts                 # Spotify API types
├── visualizer.ts              # Visualization types
├── store.ts                   # Store types
└── index.ts
```

### `/public` - Static Assets

```
public/
├── favicon.ico
├── logo.svg
├── og-image.png               # Open Graph image
└── fonts/                     # Custom fonts (if any)
```

---

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `GalaxyMode.tsx` |
| Hooks | camelCase with `use` prefix | `useNowPlaying.ts` |
| Utilities | camelCase | `colors.ts` |
| Types | camelCase | `spotify.ts` |
| Stores | camelCase with `use` prefix | `usePlayerStore.ts` |
| Pages | lowercase | `page.tsx` |
| Layouts | lowercase | `layout.tsx` |

---

## Import Aliases

Configure in `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/hooks/*": ["./src/hooks/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/stores/*": ["./src/stores/*"],
      "@/types/*": ["./src/types/*"]
    }
  }
}
```

Usage:
```tsx
import { GalaxyMode } from '@/components/visualizer';
import { useNowPlaying } from '@/hooks';
import { usePlayerStore } from '@/stores';
```

---

## Barrel Exports

Each folder should have an `index.ts` for clean imports:

```ts
// src/components/visualizer/index.ts
export { GalaxyMode } from './GalaxyMode';
export { TerrainMode } from './TerrainMode';
export { NeuralMode } from './NeuralMode';
export { RiverMode } from './RiverMode';
```

---

## Key Files Explained

| File | Purpose |
|------|---------|
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth API handler |
| `src/app/(main)/visualizer/page.tsx` | Main visualizer page |
| `src/components/visualizer/VisualizerContainer.tsx` | Orchestrates all modes |
| `src/hooks/useNowPlaying.ts` | Core polling logic |
| `src/lib/spotify/client.ts` | Spotify API wrapper |
| `src/stores/usePlayerStore.ts` | Global player state |

---

## What Goes Where?

| I want to... | Put it in... |
|--------------|--------------|
| Add a new page | `src/app/(main)/[route]/page.tsx` |
| Add a reusable UI component | `src/components/ui/` |
| Add a visualization mode | `src/components/visualizer/` |
| Add a custom hook | `src/hooks/` |
| Add a utility function | `src/lib/utils/` |
| Add Spotify API logic | `src/lib/spotify/` |
| Add global state | `src/stores/` |
| Add TypeScript types | `src/types/` |
