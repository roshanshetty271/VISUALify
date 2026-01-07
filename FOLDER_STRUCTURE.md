# VISUALify - Complete Folder Structure

## 📁 Root Directory Structure

```
visualify/
├── .cursor/
│   └── rules/                          # Cursor AI workspace rules
│       ├── 002_nextjs.mdc
│       ├── 003_typescript.mdc
│       ├── 004_react.mdc
│       ├── 005_d3.mdc
│       ├── 006_tailwind.mdc
│       ├── 007_nextauth.mdc
│       ├── 008_zustand.mdc
│       ├── 009_spotify-api.mdc
│       ├── 010_testing.mdc
│       └── 011_deployment.mdc
├── .cursor/
│   └── plans/                          # Cursor AI plans
│       └── hardened_fastapi_backend_v2_ada463a7.plan.md
├── docs/                               # Project documentation
│   ├── app_flow_document.md
│   ├── file_structure.md
│   ├── frontend_guide.md
│   ├── lean_mvp_plan.md
│   ├── PRD.md
│   ├── schema_design.md
│   └── tech_stack.md
├── node_modules/                       # Dependencies (gitignored)
├── src/                                # ⭐ FRONTEND - All source code here
│   ├── app/                            # Next.js 14 App Router
│   │   ├── api/                        # API Routes
│   │   │   └── auth/
│   │   │       └── [...nextauth]/
│   │   │           └── route.ts        # NextAuth handler
│   │   ├── favicon.ico
│   │   ├── fonts/                      # Custom fonts
│   │   │   ├── GeistMonoVF.woff
│   │   │   └── GeistVF.woff
│   │   ├── globals.css                 # Global styles
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Landing page (/)
│   │   └── visualizer/
│   │       └── page.tsx                # Visualizer page (/visualizer)
│   ├── components/                     # React components
│   │   ├── auth/                       # Authentication components
│   │   │   ├── index.ts
│   │   │   ├── LoginButton.tsx
│   │   │   └── LogoutButton.tsx
│   │   ├── providers/                  # Context providers
│   │   │   └── AuthProvider.tsx
│   │   ├── ui/                         # Generic UI components
│   │   │   ├── index.ts
│   │   │   ├── DevicePicker.tsx
│   │   │   ├── FullscreenButton.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── SettingsButton.tsx
│   │   │   ├── SettingsPanel.tsx
│   │   │   └── SyncButton.tsx
│   │   └── visualizer/                 # Visualization components
│   │       ├── index.ts
│   │       ├── GalaxyMode.tsx
│   │       ├── ModeSelector.tsx
│   │       ├── NeuralMode.tsx
│   │       ├── NowPlaying.tsx
│   │       ├── ParticlesMode.tsx
│   │       ├── PlaybackControls.tsx
│   │       ├── PlaylistQueue.tsx
│   │       ├── ProgressBar.tsx
│   │       ├── RiverMode.tsx
│   │       ├── TerrainMode.tsx
│   │       ├── VisualizerContainer.tsx
│   │       └── WaveformMode.tsx
│   ├── hooks/                          # Custom React hooks
│   │   ├── index.ts
│   │   ├── useBPM.ts
│   │   ├── useDevices.ts
│   │   ├── useFullscreen.ts
│   │   ├── useNowPlaying.ts
│   │   ├── usePlaybackControls.ts
│   │   └── useRecentTracks.ts
│   ├── lib/                            # Utility libraries
│   │   ├── auth/                       # Auth utilities
│   │   │   └── refreshToken.ts         # Token refresh logic
│   │   ├── spotify/                    # Spotify API client
│   │   │   ├── index.ts
│   │   │   ├── client.ts               # Main Spotify API wrapper
│   │   │   └── errors.ts               # Spotify error types
│   │   └── utils/                      # General utilities
│   │       └── seededRandom.ts
│   ├── stores/                         # Zustand state management
│   │   ├── index.ts
│   │   ├── usePlayerStore.ts           # Player state (track, playback)
│   │   ├── useSettingsStore.ts         # User settings
│   │   └── useThemeStore.ts            # Theme preferences
│   └── types/                          # TypeScript type definitions
│       ├── index.ts
│       ├── next-auth.d.ts              # NextAuth type extensions
│       └── spotify.ts                  # Spotify API types
├── .env.local                          # Environment variables (gitignored)
├── .gitignore
├── next-env.d.ts                       # Next.js TypeScript declarations
├── next.config.mjs                     # Next.js configuration
├── package.json                        # Dependencies and scripts
├── package-lock.json                   # Lock file
├── postcss.config.mjs                 # PostCSS configuration
├── PREMIUM_UPGRADE_COMPLETE.md
├── README.md
├── SETUP_COMPLETE.md
├── tailwind.config.ts                  # Tailwind CSS configuration
└── tsconfig.json                       # TypeScript configuration
```

---

## 🔍 Key Answers to Your Questions

### 1. **Frontend Location**
✅ **Frontend is in `/src`** (not `/frontend`)

The entire frontend application lives in the `src/` directory:
- Pages: `src/app/`
- Components: `src/components/`
- Hooks: `src/hooks/`
- Utilities: `src/lib/`
- Stores: `src/stores/`
- Types: `src/types/`

### 2. **Authentication Setup**

✅ **NextAuth.js is configured** at:
```
src/app/api/auth/[...nextauth]/route.ts
```

**How it works:**
- Uses NextAuth.js with Spotify Provider
- OAuth flow: User → Spotify → NextAuth callback → JWT token
- **Token Storage**: Tokens are stored in **NextAuth JWT session** (in-memory, not database)
  - `accessToken`: Stored in JWT token object
  - `refreshToken`: Stored in JWT token object
  - `expiresAt`: Timestamp for token expiry
- Token refresh happens automatically via `src/lib/auth/refreshToken.ts`
- Session is managed via httpOnly cookies (NextAuth default)

**Token Flow:**
1. User clicks "Login with Spotify"
2. Redirects to Spotify OAuth
3. Spotify redirects back to `/api/auth/callback/spotify`
4. NextAuth exchanges code for tokens
5. Tokens stored in JWT (encrypted cookie)
6. Session accessible via `useSession()` hook

### 3. **Current API Routes**

✅ **API routes hit Spotify directly from frontend**

**Current API Routes:**
```
src/app/api/auth/[...nextauth]/route.ts
```
- Handles: `/api/auth/signin`, `/api/auth/callback/spotify`, `/api/auth/signout`
- Purpose: OAuth authentication only

**Spotify API Calls:**
All Spotify API calls are made **directly from the frontend** via:
```
src/lib/spotify/client.ts
```

This client makes direct HTTP requests to `https://api.spotify.com/v1` using the access token from the NextAuth session.

**No backend API routes exist** for Spotify data - everything is client-side.

---

## 📊 Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    USER BROWSER                          │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Next.js Frontend (src/)                  │  │
│  │                                                   │  │
│  │  ┌──────────────┐    ┌──────────────────────┐  │  │
│  │  │ NextAuth     │    │ Spotify Client        │  │  │
│  │  │ /api/auth/   │    │ src/lib/spotify/     │  │  │
│  │  │              │    │                       │  │  │
│  │  │ - OAuth      │    │ - getNowPlaying()     │  │  │
│  │  │ - JWT tokens │    │ - getAudioFeatures()  │  │  │
│  │  │ - Sessions   │    │ - play/pause/next()   │  │  │
│  │  └──────────────┘    └──────────────────────┘  │  │
│  │         │                      │                │  │
│  │         │                      │                │  │
│  └─────────┼──────────────────────┼────────────────┘  │
│            │                      │                     │
└────────────┼──────────────────────┼─────────────────────┘
             │                      │
             ▼                      ▼
    ┌─────────────────┐    ┌──────────────────┐
    │  Spotify OAuth  │    │  Spotify Web API │
    │  accounts.      │    │  api.spotify.com │
    │  spotify.com    │    │                  │
    └─────────────────┘    └──────────────────┘
```

---

## 🚀 Backend Status

**Current State:** ❌ **No backend exists**

The plan file (`.cursor/plans/hardened_fastapi_backend_v2_ada463a7.plan.md`) describes a FastAPI backend, but it's **not implemented yet**.

**If you add a backend**, it would likely go in:
```
backend/
├── app/
│   ├── api/
│   ├── core/
│   ├── models/
│   ├── services/
│   └── websocket/
├── requirements.txt
└── main.py
```

But currently, **everything is frontend-only**.

---

## 📝 Import Aliases

All imports use the `@/` prefix (configured in `tsconfig.json`):

```typescript
import { GalaxyMode } from '@/components/visualizer';
import { useNowPlaying } from '@/hooks';
import { usePlayerStore } from '@/stores';
import { spotifyClient } from '@/lib/spotify';
import type { Track } from '@/types';
```

---

## 🔐 Environment Variables

Required in `.env.local`:
```env
# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret

# NextAuth
NEXTAUTH_SECRET=your_secret_key
NEXTAUTH_URL=http://localhost:3000
```

---

## 📦 Dependencies

**Core:**
- `next@14.2.35` - Next.js framework
- `react@18` - React library
- `next-auth@4.24.13` - Authentication
- `zustand@5.0.9` - State management
- `d3@7.9.0` - Data visualization

**Styling:**
- `tailwindcss@3.4.1` - CSS framework
- `postcss@8` - CSS processing

**TypeScript:**
- `typescript@5` - Type checking
- `@types/*` - Type definitions

---

## 🎯 Summary

| Question | Answer |
|----------|--------|
| **Frontend location** | `/src` (not `/frontend`) |
| **NextAuth configured?** | ✅ Yes, at `src/app/api/auth/[...nextauth]/route.ts` |
| **Token storage** | NextAuth JWT (in-memory session, httpOnly cookies) |
| **API routes** | Only `/api/auth/*` for OAuth |
| **Spotify API calls** | Direct from frontend via `src/lib/spotify/client.ts` |
| **Backend exists?** | ❌ No backend - frontend-only app |

