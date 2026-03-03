"""
VISUALify API — Vercel Serverless Entry Point

Slim wrapper that mounts the same FastAPI routers used by the local backend,
minus WebSocket and background tasks (not supported in serverless).
"""
import sys
import os
import logging

# Add backend/ to the Python path so existing `from app.…` imports resolve
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.exceptions import AppException, app_exception_handler
from app.api import auth, health, stats

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()

app = FastAPI(
    title="VISUALify API",
    description="Spotify visualization backend (serverless)",
    version="1.0.0",
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# ---------- Middleware ----------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- Exception handlers ----------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_exception_handler(AppException, app_exception_handler)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
        },
    )


# ---------- Lazy service initialization ----------
# Serverless functions are short-lived — set up shared clients on first request.

_initialized = False


@app.middleware("http")
async def ensure_initialized(request: Request, call_next):
    global _initialized
    if not _initialized:
        import httpx
        import redis.asyncio as aioredis
        from app.core.cache import init_cache

        app.state.http_client = httpx.AsyncClient(
            timeout=httpx.Timeout(10.0, connect=5.0),
        )

        redis_client = None
        if settings.redis_url:
            try:
                redis_client = aioredis.from_url(
                    settings.redis_url,
                    encoding="utf-8",
                    decode_responses=True,
                )
                await redis_client.ping()
                logger.info("Redis connected (serverless)")
            except Exception as e:
                logger.warning(f"Redis unavailable: {e}")
                redis_client = None
        app.state.redis = redis_client
        init_cache(redis_client)
        _initialized = True

    return await call_next(request)


# ---------- Routers ----------

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(stats.router)


@app.get("/")
async def root():
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "runtime": "vercel-serverless",
    }
