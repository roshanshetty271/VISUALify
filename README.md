# VISUALify 🎶

**Real-time Spotify music visualization and deep listening analytics.** 

VISUALify transforms your Spotify playback into an immersive sensory experience. By combining real-time song data with advanced audio analysis, it creates a living bridge between your ears and your eyes, while providing deep insights into your musical journey.

---

## 🎹 Immersive Visualizer Modes

Switch between three distinct, beat-reactive experiences:

### 1. Lyrics Mode
**Real-time Synced Lyrics Playground**
- Dynamic lyrics that fall and bounce in synchronization with your music.
- Interactive physics: Watch as words react to the beat and "bounce" off the UI.
- Full theme integration: Colors shift and flow to match your current vibe.

### 2. Canvas Mode
**Beat-Reactive Abstract Art**
- High-fidelity visualizers that paint dynamic, abstract patterns.
    - **Galaxy**: A swirling cosmic field that expands and pulses with every kick drum.
    - **Neural**: Digital synapses that fire and connect based on track energy.
    - **Pulse**: Vibrant geometric forms that react in real-time to frequencies.

### 3. Piano Mode
**Interactive Full-Screen Keyboard**
- A playable, 2-octave piano that takes center stage.
- **Sound Synthesis**: Built-in Web Audio API synthesizer lets you play along with the track.
- **Visual Feedback**: Keys react visually to the music's energy and your manual interactions.

---

## 📊 Deep Listening Analytics

Beyond the visuals, VISUALify provides a masterclass in self-discovery through your data.

### 📈 Stats Dashboard
- **Total Analytics**: Track your total plays, unique artists, and total listening minutes.
- **Audio Profile**: Visualize your musical taste with a radar chart mapping metrics like Energy, Valence (Happiness), and Acousticness.
- **Music Phases**: Discover how your listening patterns evolve throughout the week.
- **Spotify Sync**: One-click history import ensures your dashboard is always reflecting your latest sessions.

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Visualization**: D3.js, Canvas 2D API, Web Audio API
- **State Management**: Zustand, React Query
- **Authentication**: NextAuth.js (Spotify Provider)
- **Backend**: FastAPI (Python) for heavy data processing and mood analysis

---

## 🚀 Quick Start

1. **Clone the repo** and run `npm install`.
2. **Set up your `.env.local`** with your Spotify Developer credentials (`SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`).
3. **Configure Redirect URIs** in the Spotify Dashboard: `http://localhost:3000/api/auth/callback/spotify`.
4. **Run development server**: `npm run dev`.
5. **Start the backend**: `uvicorn app.main:app --reload` from the `backend/` directory.

---

Built by Roshan Shetty. Licensed under MIT.