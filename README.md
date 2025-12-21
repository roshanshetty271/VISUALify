# VISUALify Starter Kit

Everything you need to build VISUALify in Cursor.

## What's Included

### 📁 `/docs` - Project Documentation

| File | Purpose |
|------|---------|
| `PRD.md` | Product requirements and features |
| `tech_stack.md` | Technology choices with rationale |
| `file_structure.md` | Folder organization guide |
| `frontend_guide.md` | React + D3.js patterns |
| `schema_design.md` | TypeScript types and data models |
| `app_flow_document.md` | User journey and state flows |
| `lean_mvp_plan.md` | 4-week build timeline |

### 📁 `/.cursor/rules` - Cursor AI Rules

| File | Purpose |
|------|---------|
| `001_project.mdc` | Project overview and constraints |
| `002_nextjs.mdc` | Next.js 14 App Router patterns |
| `003_typescript.mdc` | TypeScript strict mode rules |
| `004_react.mdc` | React hooks and component patterns |
| `005_d3.mdc` | D3.js + React integration |
| `006_tailwind.mdc` | Tailwind CSS and animations |
| `007_nextauth.mdc` | Spotify OAuth setup |
| `008_zustand.mdc` | State management patterns |
| `009_spotify-api.mdc` | Rate limiting and API handling |
| `010_testing.mdc` | Testing strategy |
| `011_deployment.mdc` | Vercel deployment |

## Quick Start

### 1. Create Spotify App

1. Go to [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Click **Create App**
3. Set Redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret

### 2. Create Next.js Project

```bash
npx create-next-app@14 visualify --typescript --tailwind --app --src-dir
cd visualify
```

### 3. Copy Starter Kit Files

Copy the `docs/` and `.cursor/` folders into your project root.

### 4. Install Dependencies

```bash
npm install next-auth d3 zustand
npm install -D @types/d3
```

### 5. Set Environment Variables

Create `.env.local`:

```env
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

Generate secret:
```bash
openssl rand -base64 32
```

### 6. Start Building!

```bash
npm run dev
```

Open Cursor and start implementing. The rules will guide the AI.

## How to Use the Rules

The `.mdc` rules automatically activate when you're working on relevant files:

- Working on `src/app/` → Next.js rules activate
- Working on `src/components/visualizer/` → D3.js rules activate
- Working on `src/stores/` → Zustand rules activate

The `001_project.mdc` rule is always active and provides project context.

## Build Order (Recommended)

Follow the `lean_mvp_plan.md` timeline:

**Week 1:** Auth + Polling + Basic Galaxy
**Week 2:** Audio Features + All 4 Modes
**Week 3:** Error Handling + Polish
**Week 4:** Deploy + Launch

## Key Commands for Cursor

When chatting with Cursor AI:

```
"Set up NextAuth with Spotify provider"
"Create the useNowPlaying hook with polling"
"Build the Galaxy visualization mode"
"Add rate limit handling to the Spotify client"
```

The rules will ensure Cursor follows best practices.

## Need Help?

1. Read the relevant doc in `/docs`
2. Check the relevant rule in `/.cursor/rules`
3. Ask Cursor AI with context about your issue

---

**Built for your portfolio. Ship it!** 🚀
