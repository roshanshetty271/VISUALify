# VISUALify - Product Requirements Document

## Overview

**Product Name:** VISUALify  
**Tagline:** "See your sound"  
**Type:** Real-time music visualization web application  
**Target Users:** Spotify users who want to visualize their listening experience

---

## Problem Statement

Music streaming is purely auditory. Users have no visual representation of their listening habits, mood, or the characteristics of their music. Existing visualizers are either:
- Built into desktop apps (not web)
- Not connected to real listening data
- Generic and not personalized

---

## Solution

VISUALify connects to a user's Spotify account and creates a living, breathing visualization that reacts in real-time to whatever they're playing. The visualization reflects audio features like energy, tempo, valence (happiness), and danceability.

---

## Core Features (MVP)

### 1. Spotify Authentication
- OAuth 2.0 via NextAuth.js
- Scopes: `user-read-playback-state`, `user-read-currently-playing`, `user-read-recently-played`
- Silent token refresh
- Graceful session handling

### 2. Now Playing Detection
- Poll Spotify API every 3 seconds
- Detect current track, artist, album art
- Fetch audio features (energy, tempo, valence, danceability, loudness)
- Cache audio features by track ID

### 3. Visualization Modes

#### Galaxy Mode (Default)
- Current track as glowing "sun" at center
- Recent tracks orbit as "planets"
- Node size = track popularity/energy
- Node color = energy → hue mapping
- Pulse speed = synced to BPM
- D3 force simulation for positioning

#### Terrain Mode
- Synthwave/retrowave aesthetic
- Audio features as waveform mountains
- CSS 3D perspective grid floor
- Animated SVG paths

#### Neural Mode
- Tracks as nodes in a network
- Connection lines show musical similarity
- Animated "data flow" effect on lines
- K-means clustering by audio features

#### River Mode
- Timeline-based horizontal flow
- Listening history as a curved stream
- Color gradient based on energy over time

### 4. Real-time Updates
- Smooth transitions between tracks
- CSS animations synced to BPM via custom properties
- No jarring re-renders

### 5. Edge Case Handling
- Nothing playing → "Start playing on Spotify" prompt
- Private session → "Private session detected" message
- Audio features unavailable → Default neutral colors
- Rate limited → Graceful backoff with "Syncing..." state
- Token expired → Silent refresh
- Network error → Retry with backoff

---

## Non-Functional Requirements

### Performance
- Initial load < 3 seconds
- Smooth 60fps animations
- SVG rendering for up to 50 nodes
- Minimal JavaScript bundle

### Accessibility
- Respects `prefers-reduced-motion`
- Screen reader announcements for track changes
- Keyboard navigation for mode switching

### Security
- No secrets exposed to client
- OAuth handled server-side via API routes
- No user data stored (stateless)

### SEO
- Static landing page for discoverability
- Dynamic OG images for sharing
- Proper meta tags

---

## User Stories

### Authentication
- As a user, I can log in with my Spotify account
- As a user, I stay logged in across sessions
- As a user, I can log out

### Visualization
- As a user, I see my current track visualized immediately
- As a user, I can switch between 4 visualization modes
- As a user, the visualization pulses to the beat of my music
- As a user, I see my recent tracks represented visually

### Edge Cases
- As a user, I see a helpful prompt when nothing is playing
- As a user, I'm informed when my session is private
- As a user, the app recovers gracefully from errors

---

## Success Metrics

- User can authenticate and see visualization within 10 seconds
- Visualization updates within 5 seconds of track change
- Zero rate limit errors in normal usage
- All 4 modes functional and visually distinct

---

## Out of Scope (v1)

- Playlist analysis
- Historical data beyond recent tracks
- Social features / sharing
- Mobile-specific optimizations
- Offline mode
- User accounts / data persistence

---

## Timeline

| Week | Milestone |
|------|-----------|
| 1 | Auth + polling + basic Galaxy mode |
| 2 | All 4 modes + audio feature integration |
| 3 | Edge cases + polish + responsive |
| 4 | Deploy + documentation + launch |
