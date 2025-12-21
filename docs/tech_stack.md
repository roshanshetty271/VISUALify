# VISUALify - Tech Stack

## Overview

This document outlines the technology choices for VISUALify and the rationale behind each decision.

---

## Core Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js | 14.x |
| Language | TypeScript | 5.x |
| Visualization | D3.js | 7.x |
| Styling | Tailwind CSS | 3.x |
| State | Zustand | 4.x |
| Auth | NextAuth.js | 4.x |
| Hosting | Vercel | - |

---

## Framework: Next.js 14

### Why Next.js?
- **App Router**: Modern React patterns with Server Components
- **API Routes**: Serverless backend for OAuth without separate server
- **SSR/SSG**: SEO-friendly landing page
- **Vercel Integration**: Zero-config deployment
- **Industry Standard**: Widely adopted, great documentation

### Why Not Alternatives?
- **Vite + React**: No built-in API routes for OAuth
- **Remix**: Overkill for this use case, smaller community
- **Create React App**: Deprecated, no SSR

### Configuration
```bash
npx create-next-app@14 visualify --typescript --tailwind --app --src-dir
```

---

## Language: TypeScript

### Why TypeScript?
- **Type Safety**: Catch errors at compile time
- **IDE Support**: Better autocomplete, refactoring
- **Documentation**: Types serve as documentation
- **Industry Standard**: Expected in professional projects

### Configuration
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

---

## Visualization: D3.js

### Why D3.js?
- **Industry Standard**: The gold standard for data visualization
- **Force Simulations**: Perfect for the Galaxy mode orbital mechanics
- **Full Control**: No abstraction layer limiting creativity
- **Portfolio Signal**: Shows mastery of complex visualization

### Why Not Alternatives?
- **Chart.js**: Too high-level, limited customization
- **Recharts**: Great for charts, not for custom visualizations
- **Three.js**: Overkill for 2D, steeper learning curve
- **Canvas**: Less accessible, harder to style

### Integration Pattern
We use the "React renders, D3 calculates" pattern:
- D3 handles: scales, force simulations, color interpolation
- React handles: rendering SVG elements, state, lifecycle

```tsx
// D3 calculates
const scale = d3.scaleLinear().domain([0, 1]).range([0, 100]);

// React renders
<circle cx={scale(energy)} r={10} />
```

---

## Styling: Tailwind CSS

### Why Tailwind?
- **Utility-First**: Rapid prototyping, consistent spacing
- **Custom Animations**: Easy to extend with keyframes
- **CSS Variables**: Dynamic values via `--bpm` for tempo sync
- **Dark Mode**: Built-in support
- **Small Bundle**: JIT compiler, only ships used classes

### Custom Configuration
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      animation: {
        'pulse-slow': 'pulse var(--pulse-duration, 2s) ease-in-out infinite',
        'orbit': 'orbit var(--orbit-duration, 10s) linear infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        orbit: {
          '0%': { transform: 'rotate(0deg) translateX(var(--orbit-radius)) rotate(0deg)' },
          '100%': { transform: 'rotate(360deg) translateX(var(--orbit-radius)) rotate(-360deg)' },
        },
        glow: {
          '0%, 100%': { filter: 'drop-shadow(0 0 10px var(--glow-color))' },
          '50%': { filter: 'drop-shadow(0 0 30px var(--glow-color))' },
        },
      },
    },
  },
};
```

---

## State Management: Zustand

### Why Zustand?
- **Minimal Boilerplate**: No providers, no reducers
- **TypeScript Native**: Excellent type inference
- **Small Bundle**: ~1KB gzipped
- **React 18 Ready**: No context loss issues
- **Selective Subscriptions**: Only re-render what changes

### Why Not Alternatives?
- **Redux**: Too much boilerplate for this scale
- **Context API**: Re-renders entire tree on change
- **Jotai/Recoil**: Atom-based, different mental model

### Store Structure
```ts
// stores/usePlayerStore.ts
interface PlayerState {
  currentTrack: Track | null;
  audioFeatures: AudioFeatures | null;
  recentTracks: Track[];
  isPlaying: boolean;
  error: string | null;
}

interface PlayerActions {
  setCurrentTrack: (track: Track) => void;
  setAudioFeatures: (features: AudioFeatures) => void;
  setRecentTracks: (tracks: Track[]) => void;
  setError: (error: string | null) => void;
}
```

---

## Authentication: NextAuth.js

### Why NextAuth.js?
- **Built-in Spotify Provider**: Zero custom OAuth code
- **App Router Support**: Works with Route Handlers
- **Token Refresh**: Handles refresh tokens automatically
- **Session Management**: Secure, httpOnly cookies

### Scopes Required
```ts
const scopes = [
  'user-read-playback-state',    // Get current playback
  'user-read-currently-playing', // Get currently playing track
  'user-read-recently-played',   // Get recent tracks
].join(' ');
```

### Token Refresh Strategy
```ts
// Refresh token 5 minutes before expiry
if (Date.now() > token.accessTokenExpires - 5 * 60 * 1000) {
  return refreshAccessToken(token);
}
```

---

## Hosting: Vercel

### Why Vercel?
- **Zero Config**: Automatic Next.js optimization
- **Free Tier**: Sufficient for portfolio project
- **Edge Functions**: Fast API routes globally
- **Preview Deployments**: Every PR gets a preview URL
- **Analytics**: Built-in performance monitoring

### Environment Variables
```env
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
NEXTAUTH_SECRET=xxx
NEXTAUTH_URL=https://visualify.vercel.app
```

---

## Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code quality |
| Prettier | Code formatting |
| Vitest | Unit testing |
| React Testing Library | Component testing |
| Husky | Git hooks |
| lint-staged | Pre-commit linting |

---

## API Dependencies

| API | Purpose | Rate Limit |
|-----|---------|------------|
| Spotify Web API | Playback, audio features | Rolling 30s window |
| Spotify Auth | OAuth 2.0 | N/A |

---

## Bundle Size Targets

| Metric | Target |
|--------|--------|
| First Load JS | < 100KB |
| D3 (tree-shaken) | < 30KB |
| Zustand | < 2KB |
| Total | < 150KB |

---

## Browser Support

- Chrome 90+
- Firefox 90+
- Safari 14+
- Edge 90+

No IE11 support (uses modern CSS features).
