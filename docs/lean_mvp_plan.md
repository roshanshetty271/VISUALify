# VISUALify - Lean MVP Plan

## Overview

4-week build plan to ship a portfolio-ready music visualization app.

---

## Week 1: Foundation

### Goal
Working authentication + basic visualization showing current track

### Day 1-2: Project Setup

**Tasks:**
- [ ] Initialize Next.js 14 project with TypeScript
- [ ] Configure Tailwind CSS with custom theme
- [ ] Set up folder structure per `file_structure.md`
- [ ] Configure ESLint + Prettier
- [ ] Create Spotify Developer App
- [ ] Set up environment variables

**Commands:**
```bash
npx create-next-app@14 visualify --typescript --tailwind --app --src-dir
cd visualify
npm install next-auth @auth/core d3 zustand
npm install -D @types/d3
```

**Deliverable:** Empty project with correct structure

---

### Day 3-4: Authentication

**Tasks:**
- [ ] Set up NextAuth.js with Spotify provider
- [ ] Configure OAuth scopes
- [ ] Create auth API route (`/api/auth/[...nextauth]/route.ts`)
- [ ] Implement token refresh callback
- [ ] Create SessionProvider wrapper
- [ ] Build Login button component
- [ ] Build Logout button component
- [ ] Create protected route middleware

**Files to create:**
```
src/app/api/auth/[...nextauth]/route.ts
src/components/auth/LoginButton.tsx
src/components/auth/LogoutButton.tsx
src/components/auth/SessionProvider.tsx
src/middleware.ts
```

**Deliverable:** Can log in/out with Spotify

---

### Day 5-6: Now Playing

**Tasks:**
- [ ] Create Spotify API client (`src/lib/spotify/client.ts`)
- [ ] Build `useNowPlaying` hook with polling
- [ ] Implement Page Visibility API (pause when tab hidden)
- [ ] Create Zustand player store
- [ ] Build NowPlaying display component
- [ ] Handle "nothing playing" state

**Files to create:**
```
src/lib/spotify/client.ts
src/hooks/useNowPlaying.ts
src/hooks/usePolling.ts
src/stores/usePlayerStore.ts
src/components/visualizer/NowPlaying.tsx
```

**Deliverable:** Shows current track name/artist when playing

---

### Day 7: Basic Galaxy Mode

**Tasks:**
- [ ] Create SVG container component
- [ ] Build basic circle for current track
- [ ] Add pulsing animation (hardcoded timing)
- [ ] Connect to player store
- [ ] Style with Tailwind

**Files to create:**
```
src/components/visualizer/VisualizerContainer.tsx
src/components/visualizer/GalaxyMode.tsx
src/app/(main)/visualizer/page.tsx
```

**Deliverable:** Circle that appears when track playing

---

## Week 2: Audio Features + All Modes

### Goal
Full audio feature integration, all 4 visualization modes working

### Day 8-9: Audio Features

**Tasks:**
- [ ] Add audio features endpoint to Spotify client
- [ ] Create audio features cache (by track ID)
- [ ] Build `useAudioFeatures` hook
- [ ] Add features to player store
- [ ] Create color mapping utility (energy → hue)
- [ ] Create size mapping utility (loudness → radius)
- [ ] Connect to Galaxy mode

**Files to create:**
```
src/hooks/useAudioFeatures.ts
src/lib/utils/colors.ts
src/lib/utils/scales.ts
```

**Deliverable:** Circle color/size changes based on track energy

---

### Day 10: BPM Sync

**Tasks:**
- [ ] Create `useBPM` hook
- [ ] Set CSS custom properties from tempo
- [ ] Update Tailwind config with CSS variable animations
- [ ] Connect pulse animation to BPM

**Files to create:**
```
src/hooks/useBPM.ts
```

**Update:**
```
tailwind.config.js (add custom animations)
src/app/globals.css (add keyframes)
```

**Deliverable:** Circle pulses to the beat

---

### Day 11-12: Recent Tracks + Force Simulation

**Tasks:**
- [ ] Add recently played endpoint to Spotify client
- [ ] Build `useRecentTracks` hook
- [ ] Create D3 force simulation hook
- [ ] Add orbital nodes for recent tracks
- [ ] Implement collision detection
- [ ] Add smooth transitions between states

**Files to create:**
```
src/hooks/useRecentTracks.ts
src/hooks/useForceSimulation.ts
src/components/visualizer/TrackNode.tsx
```

**Deliverable:** Current track as sun, recent tracks orbiting

---

### Day 13-14: Additional Modes

**Tasks:**
- [ ] Build Terrain mode (synthwave aesthetic)
- [ ] Build Neural mode (network graph)
- [ ] Build River mode (timeline flow)
- [ ] Create mode selector component
- [ ] Add mode to visualizer store
- [ ] Implement mode switching animation

**Files to create:**
```
src/components/visualizer/TerrainMode.tsx
src/components/visualizer/NeuralMode.tsx
src/components/visualizer/RiverMode.tsx
src/components/visualizer/ModeSelector.tsx
src/stores/useVisualizerStore.ts
```

**Deliverable:** All 4 modes functional, switchable

---

## Week 3: Edge Cases + Polish

### Goal
Production-ready error handling, responsive design, animations polish

### Day 15-16: Error Handling

**Tasks:**
- [ ] Implement rate limit detection (429)
- [ ] Add Retry-After header handling
- [ ] Create exponential backoff utility
- [ ] Build error state UI ("Syncing...")
- [ ] Handle "nothing playing" state UI
- [ ] Handle "private session" state UI
- [ ] Implement silent token refresh
- [ ] Add error boundary

**Files to create:**
```
src/lib/utils/retry.ts
src/components/ui/ErrorState.tsx
src/components/ui/EmptyState.tsx
src/app/error.tsx
```

**Deliverable:** App handles all error states gracefully

---

### Day 17-18: Loading States + Transitions

**Tasks:**
- [ ] Create loading skeleton for visualizer
- [ ] Add Suspense boundaries
- [ ] Implement smooth track transitions
- [ ] Add enter/exit animations for nodes
- [ ] Polish mode switching transitions
- [ ] Add loading spinner component

**Files to create:**
```
src/components/ui/LoadingSpinner.tsx
src/components/ui/Skeleton.tsx
src/app/loading.tsx
```

**Deliverable:** No jarring state changes, smooth UX

---

### Day 19-20: Responsive Design

**Tasks:**
- [ ] Test on mobile viewports
- [ ] Adjust SVG viewBox for mobile
- [ ] Make mode selector touch-friendly
- [ ] Adjust node sizes for small screens
- [ ] Test landscape/portrait
- [ ] Add `prefers-reduced-motion` support

**Deliverable:** Works well on phones and tablets

---

### Day 21: Accessibility

**Tasks:**
- [ ] Add ARIA labels to interactive elements
- [ ] Implement keyboard navigation for modes
- [ ] Add screen reader announcements for track changes
- [ ] Test with screen reader
- [ ] Ensure color contrast compliance

**Deliverable:** Accessible to keyboard and screen reader users

---

## Week 4: Launch

### Goal
Deployed, documented, shareable

### Day 22-23: SEO + Metadata

**Tasks:**
- [ ] Add page metadata (title, description)
- [ ] Create Open Graph image
- [ ] Add Twitter card metadata
- [ ] Create favicon and app icons
- [ ] Add manifest.json
- [ ] Create robots.txt
- [ ] Add sitemap

**Files to create:**
```
src/app/layout.tsx (update metadata)
public/og-image.png
public/favicon.ico
public/manifest.json
```

**Deliverable:** Looks good when shared on social media

---

### Day 24-25: Landing Page Polish

**Tasks:**
- [ ] Design hero section with logo animation
- [ ] Add feature highlights
- [ ] Create screenshots/GIFs of visualization
- [ ] Add "Powered by Spotify" attribution
- [ ] Add privacy note
- [ ] Style footer

**Deliverable:** Professional landing page

---

### Day 26: Deployment

**Tasks:**
- [ ] Create Vercel account (if needed)
- [ ] Connect GitHub repo
- [ ] Configure environment variables in Vercel
- [ ] Update Spotify app redirect URI for production
- [ ] Deploy to production
- [ ] Test all flows on production
- [ ] Set up custom domain (optional)

**Deliverable:** Live at `visualify.vercel.app`

---

### Day 27-28: Documentation + Launch

**Tasks:**
- [ ] Write README.md with setup instructions
- [ ] Create demo GIF for README
- [ ] Document environment variables
- [ ] Write "How it works" section
- [ ] Add link to portfolio
- [ ] Share on LinkedIn/Twitter
- [ ] Submit to r/webdev, r/reactjs

**Files to create:**
```
README.md
CONTRIBUTING.md (optional)
```

**Deliverable:** Ready to show recruiters

---

## Milestone Checklist

### Week 1 Complete ✓
- [ ] Can authenticate with Spotify
- [ ] Shows current track info
- [ ] Basic circle visualization appears

### Week 2 Complete ✓
- [ ] Colors/sizes based on audio features
- [ ] Pulses to the beat
- [ ] Recent tracks orbit
- [ ] All 4 modes work

### Week 3 Complete ✓
- [ ] Handles all error states
- [ ] Smooth animations
- [ ] Works on mobile
- [ ] Accessible

### Week 4 Complete ✓
- [ ] Deployed and live
- [ ] Professional landing page
- [ ] Documented
- [ ] Shared publicly

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Spotify rate limits | Cache aggressively, implement backoff |
| D3 performance | Start with SVG, profile, optimize if needed |
| Auth complexity | Use NextAuth.js, follow their examples |
| Scope creep | Stick to MVP features, defer nice-to-haves |
| Deployment issues | Test locally with production env vars first |

---

## Post-MVP Ideas (Future)

- Playlist analysis mode
- Share visualization as image
- Historical listening trends
- Multiple color themes
- Audio playback preview
- Collaborative visualizations

**Do not build these until MVP is shipped!**
