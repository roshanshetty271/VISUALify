# VISUALify

Real-time Spotify music visualization. See your sound.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![D3.js](https://img.shields.io/badge/D3.js-7-orange)
![Tailwind](https://img.shields.io/badge/Tailwind-3-06B6D4)

---

## Quick Start

### 1. Install Dependencies

```bash
npm install next-auth d3 zustand
npm install -D @types/d3
```

### 2. Set Up Environment

Create `.env.local` in project root:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://127.0.0.1:3000
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Spotify Dashboard

Add redirect URI in [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):
```
http://127.0.0.1:3000/api/auth/callback/spotify
```

### 4. Run

```bash
npm run dev
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## Project Structure

```
src/
├── app/
│   ├── api/auth/[...nextauth]/route.ts  # Auth handler
│   ├── (main)/visualizer/page.tsx       # Main visualization
│   ├── layout.tsx                       # Root layout
│   └── page.tsx                         # Landing page
├── components/
│   ├── auth/                            # Login/Logout buttons
│   ├── ui/                              # Shared UI components
│   └── visualizer/                      # Visualization modes
├── hooks/
│   ├── useNowPlaying.ts                 # Spotify polling
│   ├── useAudioFeatures.ts              # Track features
│   └── useBPM.ts                        # Tempo sync
├── lib/
│   └── spotify/                         # API client
├── stores/
│   └── usePlayerStore.ts                # Zustand state
└── types/
    └── spotify.ts                       # TypeScript types
```

---

## Features

- **Real-time sync** with Spotify playback
- **3 visualization modes**: Pulse, Orbit, Particles — each beat-reactive with exponential decay
- **BPM-synced animations** powered by a shared BeatClock using D3 easing curves
- **Audio feature mapping**: energy, valence, and tempo drive colors, sizes, and speeds via D3 scales
- **Rate limit handling** with graceful backoff

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| Visualization | D3.js (d3-ease, d3-scale, d3-interpolate) + Canvas 2D |
| Styling | Tailwind CSS |
| State | Zustand |
| Auth | NextAuth.js |
| Hosting | Vercel |

---


## Deployment

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables
4. Add production redirect URI to Spotify:
   ```
   https://your-domain.vercel.app/api/auth/callback/spotify
   ```

---

## License

MIT

---

Built by Roshan Shetty.