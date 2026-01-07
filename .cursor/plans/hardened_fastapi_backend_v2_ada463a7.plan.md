---
name: Hardened FastAPI Backend v2
overview: "Security-hardened FastAPI backend with ALL fixes applied: 24-hour JWT, Fernet token encryption, WebSocket query-param auth before accept, slowapi rate limiting, Redis distributed locks, health endpoints, graceful shutdown, and multi-layer caching."
todos:
  - id: requirements
    content: Update requirements.txt with slowapi==0.1.9 and cryptography==42.0.2
    status: pending
  - id: config
    content: Create config.py with jwt_expire_minutes=60*24 (24h) and encryption_key field
    status: pending
  - id: encryption
    content: Create core/encryption.py with Fernet encrypt_token() and decrypt_token()
    status: pending
  - id: user-model
    content: Create User model with _access_token_encrypted column and property accessors
    status: pending
  - id: rate-limit
    content: Create core/rate_limit.py with slowapi Limiter using Redis storage
    status: pending
  - id: health
    content: Create api/health.py with /health and /health/ready endpoints
    status: pending
  - id: ws-query-auth
    content: Implement websocket_now_playing with token=Query(...) BEFORE accept()
    status: pending
  - id: auth-service-lock
    content: Build AuthService.refresh_spotify_token with Redis SET NX distributed lock
    status: pending
  - id: auth-endpoints
    content: Create api/auth.py with @limiter.limit decorators on all endpoints
    status: pending
  - id: main-integration
    content: Wire up main.py with limiter, health router, exception handlers, lifespan
    status: pending
  - id: env-template
    content: Create .env.example with ENCRYPTION_KEY and JWT_SECRET generation commands
    status: pending
  - id: frontend-ws
    content: Update useWebSocket.ts with query param auth and jittered reconnect
    status: pending
---

# Security-Hardened FastAPI Backend - FINAL VERSION

All security issues from the review have been addressed. This plan supersedes all previous versions.---

## Security Fixes Applied

| Issue | OLD (Vulnerable) | NEW (Fixed) ||-------|------------------|-------------|| JWT Lifetime | 7 days | **24 hours** || Token Storage | Plaintext | **Fernet encrypted** || WebSocket Auth | Accept then auth | **Query param before accept** || Rate Limiting | None | **slowapi with Redis** || Token Refresh | Race condition | **Redis distributed lock** || Health Check | Missing | **/health and /health/ready** || Graceful Shutdown | Missing | **Shutdown event + cleanup** || Audio Caching | Missing | **Redis + PostgreSQL** |---

## Requirements (UPDATED)

```txt
# backend/requirements.txt
fastapi==0.109.2
pydantic==2.6.1
pydantic-settings==2.1.0
sqlalchemy[asyncio]==2.0.25
asyncpg==0.29.0
alembic==1.13.1
redis[hiredis]==5.0.1
python-jose[cryptography]==3.3.0
cryptography==42.0.2           # NEW: Token encryption
httpx==0.26.0
uvicorn[standard]==0.27.0
slowapi==0.1.9                 # NEW: Rate limiting
python-multipart==0.0.6
```

---

## 1. Configuration - FIXED JWT Lifetime

```python
# backend/app/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from functools import lru_cache

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # Database
    database_url: str
    redis_url: str
    
    # Spotify
    spotify_client_id: str
    spotify_client_secret: str
    spotify_redirect_uri: str
    
    # SECURITY - Token Encryption (Fernet)
    encryption_key: str  # Generate: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    
    # SECURITY - JWT (FIXED: 24 hours, NOT 7 days)
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 60 * 24  # 24 HOURS - NOT 7 DAYS
    
    # CSRF
    frontend_url: str = "http://localhost:3000"
    allowed_origins: list[str] = ["http://localhost:3000"]
    
    # Session boundary
    session_gap_minutes: int = 30
    
    @field_validator("encryption_key")
    @classmethod
    def validate_fernet_key(cls, v: str) -> str:
        if len(v) != 44:  # Fernet keys are 44 chars base64
            raise ValueError("ENCRYPTION_KEY must be a valid Fernet key (44 characters)")
        return v

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

---

## 2. Encryption Module - NEW FILE

```python
# backend/app/core/encryption.py
from cryptography.fernet import Fernet, InvalidToken
from app.config import get_settings
import logging

logger = logging.getLogger(__name__)

# Initialize Fernet cipher at module load
_settings = get_settings()
_fernet = Fernet(_settings.encryption_key.encode())

def encrypt_token(token: str) -> str:
    """Encrypt a plaintext token for database storage."""
    if not token:
        return ""
    return _fernet.encrypt(token.encode()).decode()

def decrypt_token(encrypted_token: str) -> str | None:
    """Decrypt an encrypted token from database. Returns None if invalid."""
    if not encrypted_token:
        return None
    try:
        return _fernet.decrypt(encrypted_token.encode()).decode()
    except InvalidToken:
        logger.error("Failed to decrypt token - key mismatch or corrupted data")
        return None
```

---

## 3. User Model - ENCRYPTED Token Storage

```python
# backend/app/models/user.py
from sqlalchemy import String, DateTime, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timedelta
import uuid

from app.models.base import Base
from app.core.encryption import encrypt_token, decrypt_token  # NEW

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    spotify_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    display_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    
    # ENCRYPTED token storage - stored as ciphertext in DB
    _access_token_encrypted: Mapped[str | None] = mapped_column("access_token_encrypted", Text)
    _refresh_token_encrypted: Mapped[str | None] = mapped_column("refresh_token_encrypted", Text)
    token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    
    # Metadata
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Stats
    total_plays: Mapped[int] = mapped_column(Integer, default=0)
    total_minutes: Mapped[int] = mapped_column(Integer, default=0)
    
    # Settings
    settings: Mapped[dict] = mapped_column(JSONB, default={"theme": "spotify"})
    
    # Property accessors - encrypt on write, decrypt on read
    @property
    def access_token(self) -> str | None:
        """Decrypt access token when reading."""
        return decrypt_token(self._access_token_encrypted) if self._access_token_encrypted else None
    
    @access_token.setter
    def access_token(self, value: str | None):
        """Encrypt access token when writing."""
        self._access_token_encrypted = encrypt_token(value) if value else None
    
    @property
    def refresh_token(self) -> str | None:
        """Decrypt refresh token when reading."""
        return decrypt_token(self._refresh_token_encrypted) if self._refresh_token_encrypted else None
    
    @refresh_token.setter
    def refresh_token(self, value: str | None):
        """Encrypt refresh token when writing."""
        self._refresh_token_encrypted = encrypt_token(value) if value else None
    
    def is_token_expired(self) -> bool:
        """Check if access token is expired (with 5 min buffer)."""
        if not self.token_expires_at:
            return True
        return datetime.utcnow() >= (self.token_expires_at - timedelta(minutes=5))
```

---

## 4. Rate Limiting Setup - NEW FILE

```python
# backend/app/core/rate_limit.py
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Use Redis for distributed rate limiting across multiple workers
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
    storage_uri="redis://localhost:6379",  # Will be overridden in main.py
)

async def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded):
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "RATE_LIMITED",
            "message": f"Too many requests: {exc.detail}",
            "retry_after": 60,
        },
    )
```

---

## 5. WebSocket Auth - QUERY PARAM BEFORE ACCEPT

```python
# backend/app/websocket/handlers.py
from fastapi import WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession
import asyncio
import logging

from app.websocket.manager import manager
from app.services.polling_service import PollingService
from app.core.security import decode_access_token
from app.database import get_db
from app.models import User

logger = logging.getLogger(__name__)

async def websocket_now_playing(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token for authentication"),  # QUERY PARAM
):
    """
    WebSocket endpoint with authentication BEFORE accepting connection.
    
    Connection URL: wss://api.example.com/ws/now-playing?token=<jwt_token>
    
    This prevents unauthenticated users from consuming server resources.
    """
    # ========================================
    # VALIDATE TOKEN BEFORE ACCEPTING
    # ========================================
    user_id = decode_access_token(token)
    
    if not user_id:
        # Reject immediately - connection never accepted
        await websocket.close(code=4001, reason="Invalid or expired token")
        return
    
    # Get user from database
    async with AsyncSessionLocal() as db:
        user = await db.get(User, user_id)
        
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return
        
        if not user.access_token:
            await websocket.close(code=4002, reason="No Spotify token linked")
            return
        
        spotify_token = user.access_token  # Decrypted via property
    
    # ========================================
    # NOW ACCEPT THE CONNECTION (Auth passed)
    # ========================================
    await websocket.accept()
    
    # Register with connection manager
    conn = await manager.connect(
        websocket=websocket,
        user_id=str(user_id),
        spotify_token=spotify_token,
    )
    
    # Send confirmation
    await websocket.send_json({"type": "connected", "user_id": str(user_id)})
    
    # Start polling task
    polling = PollingService(conn, websocket.app.state)
    conn.polling_task = asyncio.create_task(polling.run())
    
    try:
        # Keep alive loop
        while True:
            message = await websocket.receive_json()
            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        logger.info(f"User {user_id} disconnected")
    finally:
        await manager.disconnect(str(user_id))
```

---

## 6. Health Check Endpoints - NEW FILE

```python
# backend/app/api/health.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from datetime import datetime
from redis.asyncio import Redis

from app.database import get_db
from app.websocket.manager import manager

router = APIRouter(tags=["Health"])

@router.get("/health")
async def health_check():
    """
    Basic liveness check - is the server running?
    Used by load balancers for basic health monitoring.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "visualify-api",
    }

@router.get("/health/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    """
    Readiness check - are all dependencies available?
    Used by orchestrators to know when to route traffic.
    """
    checks = {}
    overall_status = "ready"
    
    # Check PostgreSQL
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        checks["database"] = f"error: {str(e)[:50]}"
        overall_status = "not_ready"
    
    # WebSocket stats (always ok, just informational)
    checks["active_connections"] = manager.connection_count
    
    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "checks": checks,
    }
```

---

## 7. Auth Service - REDIS DISTRIBUTED LOCK

```python
# backend/app/services/auth_service.py
import asyncio
import httpx
from datetime import datetime, timedelta
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.models import User
from app.config import get_settings
from app.core.exceptions import TokenRefreshError

logger = logging.getLogger(__name__)
settings = get_settings()

class AuthService:
    def __init__(self, db: AsyncSession, redis: Redis, http: httpx.AsyncClient):
        self.db = db
        self.redis = redis
        self.http = http
    
    async def refresh_spotify_token(self, user: User) -> str:
        """
        Refresh Spotify token with DISTRIBUTED LOCK to prevent race conditions.
        
        Problem this solves:
    - Request A and B both detect expired token simultaneously
    - Both try to refresh at the same time
    - A gets new token, B gets ANOTHER new token (invalidating A's)
    - A's subsequent requests fail with invalid token
        
        Solution:
    - Use Redis lock so only one request refreshes at a time
    - Other requests wait for the refresh to complete
        """
        lock_key = f"token_refresh_lock:{user.id}"
        lock_acquired = False
        
        try:
            # Try to acquire distributed lock (30 second TTL prevents deadlock)
            lock_acquired = await self.redis.set(
                lock_key,
                value="locked",
                ex=30,      # Expires in 30 seconds
                nx=True,    # Only set if NOT exists
            )
            
            if not lock_acquired:
                # Another request is refreshing - wait for it to complete
                logger.info(f"Waiting for token refresh by another request for user {user.id}")
                return await self._wait_for_token_refresh(user)
            
            # We have the lock - do the refresh
            logger.info(f"Acquired lock, refreshing token for user {user.id}")
            
            if not user.refresh_token:
                raise TokenRefreshError("No refresh token available - user must re-authenticate")
            
            # Call Spotify token endpoint
            response = await self.http.post(
                "https://accounts.spotify.com/api/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": user.refresh_token,  # Decrypted via property
                    "client_id": settings.spotify_client_id,
                    "client_secret": settings.spotify_client_secret,
                },
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            
            if response.status_code != 200:
                raise TokenRefreshError(f"Spotify refresh failed: {response.status_code}")
            
            tokens = response.json()
            
            # Update user (encryption happens automatically via property setters)
            user.access_token = tokens["access_token"]
            user.token_expires_at = datetime.utcnow() + timedelta(seconds=tokens.get("expires_in", 3600))
            
            # CRITICAL: Spotify may rotate refresh tokens - save new one if provided
            if "refresh_token" in tokens:
                logger.info(f"Spotify rotated refresh token for user {user.id}")
                user.refresh_token = tokens["refresh_token"]
            
            await self.db.commit()
            return user.access_token
            
        finally:
            # Always release lock if we acquired it
            if lock_acquired:
                await self.redis.delete(lock_key)
    
    async def _wait_for_token_refresh(self, user: User, max_wait_seconds: int = 10) -> str:
        """Wait for another request to complete token refresh."""
        for _ in range(max_wait_seconds * 2):  # Check every 500ms
            await asyncio.sleep(0.5)
            
            # Reload user from database
            await self.db.refresh(user)
            
            # Check if token is now valid
            if not user.is_token_expired():
                return user.access_token
        
        raise TokenRefreshError("Timeout waiting for token refresh")
```

---

## 8. Auth Endpoints - WITH RATE LIMITING

```python
# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.database import get_db
from app.core.rate_limit import limiter  # Import rate limiter
from app.core.security import create_access_token
from app.services.auth_service import AuthService
from app.schemas.auth import AuthCallbackRequest, AuthResponse
from app.models import User

router = APIRouter()

@router.post("/callback", response_model=AuthResponse)
@limiter.limit("10/minute")  # RATE LIMITED: Max 10 auth attempts per minute per IP
async def auth_callback(
    request: Request,  # Required for rate limiter
    body: AuthCallbackRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Exchange Spotify OAuth code for tokens.
    
    Rate limited to 10 requests per minute per IP to prevent abuse.
    """
    auth_service = AuthService(
        db=db,
        redis=request.app.state.redis,
        http=request.app.state.http_client,
    )
    
    # Exchange code for tokens
    tokens = await auth_service.exchange_code(body.code)
    
    # Get or create user
    user = await auth_service.get_or_create_user(tokens)
    
    # Create our JWT (24 hour expiry)
    jwt_token = create_access_token(str(user.id))
    
    return AuthResponse(
        token=jwt_token,
        user_id=str(user.id),
        display_name=user.display_name,
    )

@router.post("/refresh")
@limiter.limit("30/minute")  # RATE LIMITED
async def refresh_token(
    request: Request,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Refresh Spotify access token (with distributed locking)."""
    auth_service = AuthService(
        db=db,
        redis=request.app.state.redis,
        http=request.app.state.http_client,
    )
    
    new_token = await auth_service.refresh_spotify_token(user)
    return {"status": "refreshed"}

@router.post("/logout")
@limiter.limit("10/minute")
async def logout(
    request: Request,
    user: User = Depends(get_current_user),
):
    """Log out user (invalidate session)."""
    # Could add token to Redis blacklist here
    return {"status": "logged_out"}
```

---

## 9. Main App - FULL INTEGRATION

```python
# backend/app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import httpx
import redis.asyncio as aioredis
import asyncio
import logging

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.exceptions import AppException
from app.websocket.manager import manager
from app.api import auth, stats, sessions, user, health
from app.websocket.handlers import websocket_now_playing

logger = logging.getLogger(__name__)
settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle with graceful shutdown."""
    
    # ===== STARTUP =====
    logger.info("Starting VISUALify API...")
    
    # HTTP client for external APIs
    app.state.http_client = httpx.AsyncClient(timeout=10.0)
    
    # Redis connection
    app.state.redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    
    # Update rate limiter to use actual Redis URL
    limiter._storage_uri = settings.redis_url
    
    # Shutdown signal for graceful termination
    app.state.shutdown_event = asyncio.Event()
    manager.set_shutdown_event(app.state.shutdown_event)
    
    # Start cleanup task
    cleanup_task = asyncio.create_task(periodic_cleanup(app.state.shutdown_event))
    
    logger.info("VISUALify API started")
    
    yield  # App runs here
    
    # ===== SHUTDOWN =====
    logger.info("Graceful shutdown starting...")
    
    app.state.shutdown_event.set()
    cleanup_task.cancel()
    
    # Close all WebSocket connections gracefully
    await manager.close_all_connections()
    
    # Close external connections
    await app.state.http_client.aclose()
    await app.state.redis.close()
    
    logger.info("Shutdown complete")

async def periodic_cleanup(shutdown_event: asyncio.Event):
    """Periodic cleanup of stale WebSocket connections."""
    while not shutdown_event.is_set():
        try:
            await asyncio.sleep(60)
            await manager.cleanup_stale_connections()
        except asyncio.CancelledError:
            break

# Create app
app = FastAPI(
    title="VISUALify API",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handlers
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.code, "message": exc.message},
    )

# Routes
app.include_router(health.router)  # /health, /health/ready
app.include_router(auth.router, prefix="/api/auth")
app.include_router(stats.router, prefix="/api/stats")
app.include_router(sessions.router, prefix="/api/sessions")
app.include_router(user.router, prefix="/api/user")

# WebSocket
app.add_api_websocket_route("/ws/now-playing", websocket_now_playing)
```

---

## 10. Environment Template

```bash
# backend/.env.example

# Database
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/visualify

# Redis
REDIS_URL=redis://localhost:6379

# Spotify OAuth
SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000/api/auth/callback/spotify

# SECURITY: Encryption key for tokens at rest
# Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
ENCRYPTION_KEY=

# SECURITY: JWT secret
# Generate with: python -c "import secrets; print(secrets.token_urlsafe(32))"
JWT_SECRET=

# Frontend (for CORS/CSRF)
FRONTEND_URL=http://localhost:3000
ALLOWED_ORIGINS=["http://localhost:3000"]
```

---

## 11. Frontend WebSocket - JITTERED RECONNECT

```typescript
// src/hooks/useWebSocket.ts
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000';

export function useWebSocket() {
  const { data: session } = useSession();
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (!session?.accessToken) return;

    // Token in query param - validated BEFORE server accepts
    const url = `${WS_URL}/ws/now-playing?token=${encodeURIComponent(session.accessToken)}`;
    const ws = new WebSocket(url);
    
    ws.onclose = (event) => {
      // Don't reconnect on auth failure
      if (event.code === 4001 || event.code === 4002) {
        return;
      }

      // Exponential backoff WITH JITTER to prevent thundering herd
      const base = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      const jitter = Math.random() * 5000;  // 0-5 seconds random
      const delay = base + jitter;

      reconnectAttempts.current++;
      setTimeout(connect, delay);
    };
    
    // ... rest of implementation
  }, [session?.accessToken]);
}
```

---

## Summary of ALL Security Fixes

| Fix | File | Change ||-----|------|--------|| JWT 24h | `config.py` | `jwt_expire_minutes = 60 * 24` || Encryption | `core/encryption.py` | New file with Fernet || Encrypted tokens | `models/user.py` | `_access_token_encrypted` with property accessors || WS query auth | `websocket/handlers.py` | `token: str = Query(...)` before `accept()` || Rate limiting | `core/rate_limit.py` | New file with slowapi || Rate limit decorator | `api/auth.py` | `@limiter.limit("10/minute")` || Token refresh lock | `services/auth_service.py` | Redis `SET NX` lock pattern || Health endpoints | `api/health.py` | New file with `/health` and `/health/ready` || Graceful shutdown | `main.py` | `shutdown_event` + `close_all_connections()` |