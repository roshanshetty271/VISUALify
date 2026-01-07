# VISUALify Backend Integration Guide

Step-by-step instructions to integrate the FastAPI backend with your existing Next.js frontend.

## Prerequisites

- Python 3.11+ installed
- Docker Desktop (for PostgreSQL + Redis)
- Your existing VISUALify frontend working

---

## Step 1: Add Backend to Your Project

### Option A: Copy the folder

```bash
# From your VISUALify project root
cp -r /path/to/visualify-backend/backend ./backend
```

### Option B: Manual structure

Create this folder structure in your project root:

```
visualify/
├── backend/           # NEW - Add this
│   ├── app/
│   ├── alembic/
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── src/               # Your existing frontend
├── package.json
└── ...
```

---

## Step 2: Generate Security Keys

**CRITICAL: Do not skip this step!**

```bash
cd backend

# Generate encryption key (for token storage)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Output: something like "Zq3B7xK9..."

# Generate JWT secret
python -c "import secrets; print(secrets.token_urlsafe(32))"
# Output: something like "aB3dE5fG..."
```

Save these values for Step 3.

---

## Step 3: Configure Backend Environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database (don't change if using docker-compose)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/visualify

# Redis (don't change if using docker-compose)
REDIS_URL=redis://localhost:6379

# Spotify (same as your frontend .env.local)
SPOTIFY_CLIENT_ID=your_actual_client_id
SPOTIFY_CLIENT_SECRET=your_actual_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# Security (paste the values you generated in Step 2)
ENCRYPTION_KEY=your_generated_encryption_key
JWT_SECRET=your_generated_jwt_secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

---

## Step 4: Start Database Services

```bash
cd backend

# Start PostgreSQL and Redis
docker-compose up -d

# Verify they're running
docker-compose ps
```

You should see:
```
NAME                 STATUS
visualify-postgres   running (healthy)
visualify-redis      running (healthy)
```

---

## Step 5: Set Up Python Environment

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate it
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

## Step 6: Run Database Migrations

```bash
cd backend

# Make sure venv is activated
alembic upgrade head
```

You should see:
```
INFO  [alembic.runtime.migration] Running upgrade  -> 001, Initial migration
```

---

## Step 7: Start the Backend

```bash
cd backend

# Make sure venv is activated
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Started server process
INFO:     Waiting for application startup.
INFO:     VISUALify API started (debug=True)
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8000
```

**Test it:**
- Open http://localhost:8000 → Should show API info
- Open http://localhost:8000/health → Should show `{"status": "healthy"}`
- Open http://localhost:8000/docs → Should show Swagger UI

---

## Step 8: Update Frontend

### 8.1 Copy Modified Hooks

```bash
# From your project root
cp frontend-changes/src/hooks/useWebSocket.ts src/hooks/
cp frontend-changes/src/hooks/useNowPlaying.ts src/hooks/
```

### 8.2 Update Hooks Index

Edit `src/hooks/index.ts` to export the new hook:

```typescript
export { useNowPlaying } from './useNowPlaying';
export { useWebSocket } from './useWebSocket';  // ADD THIS LINE
export { useBPM } from './useBPM';
// ... rest of exports
```

### 8.3 Add Environment Variables

Add to your `.env.local`:

```env
# Existing variables...
SPOTIFY_CLIENT_ID=...
SPOTIFY_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000

# NEW: Backend connection
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
```

---

## Step 9: Test the Integration

1. **Start the backend** (if not already running):
   ```bash
   cd backend && uvicorn app.main:app --reload --port 8000
   ```

2. **Start the frontend**:
   ```bash
   npm run dev
   ```

3. **Open your app**: http://localhost:3000

4. **Check the console** for:
   ```
   [useNowPlaying] Backend token acquired
   [WebSocket] Connected
   [WebSocket] Authenticated as: <your-user-id>
   ```

5. **Play a song on Spotify** and watch the visualization update!

---

## Troubleshooting

### "Backend unavailable, using fallback polling"

The frontend couldn't connect to the backend. Check:
- Is the backend running? (`uvicorn app.main:app --reload --port 8000`)
- Are PostgreSQL and Redis running? (`docker-compose ps`)
- Is `NEXT_PUBLIC_API_URL` set correctly in `.env.local`?

### "WebSocket auth failed: invalid token"

The backend JWT has expired. This is handled automatically - the frontend will request a new token.

### "Token exchange failed: 401"

Your Spotify session may have expired. Sign out and sign back in.

### "ENCRYPTION_KEY must be a valid Fernet key"

You need to generate a proper Fernet key:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

### Database connection errors

Make sure Docker containers are running:
```bash
cd backend
docker-compose down
docker-compose up -d
```

---

## Production Deployment

### Backend (Railway)

1. Create a new Railway project
2. Add PostgreSQL and Redis services
3. Deploy from your GitHub repo (point to `/backend` folder)
4. Set environment variables (use Railway's secrets)
5. Get your backend URL (e.g., `https://visualify-api.railway.app`)

### Frontend (Vercel)

1. Update `.env.local` (or Vercel env vars):
   ```env
   NEXT_PUBLIC_API_URL=https://visualify-api.railway.app
   NEXT_PUBLIC_WS_URL=wss://visualify-api.railway.app
   ```

2. Add the production URL to Spotify Dashboard redirect URIs

---

## What This Gives You

| Feature | Before | After |
|---------|--------|-------|
| Now Playing Updates | Polling every 2-5s | Real-time WebSocket |
| Spotify API Calls | From browser | From server |
| Listening History | None | Stored in PostgreSQL |
| Token Security | In browser memory | Encrypted at rest |
| Rate Limit Handling | Per-user in browser | Centralized with backoff |
| Multi-Device Support | Each tab polls | Single connection per user |

---

## Next Steps

With the backend in place, you can now add:

1. **Stats Dashboard** - Query listening history from PostgreSQL
2. **Mood Journey** - Use the `plays` table for time-series visualization
3. **Genre Analytics** - Aggregate data by genre over time
4. **Listening Sessions** - Group plays into sessions (add the model from the architecture doc)

The database schema supports all of these!
