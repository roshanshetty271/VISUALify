# backend/app/main.py
"""
VISUALify Backend - FastAPI Application

Security-hardened backend for real-time Spotify visualization.
"""
from contextlib import asynccontextmanager
import asyncio
import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
import httpx
import redis.asyncio as aioredis

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.exceptions import AppException, app_exception_handler
from app.websocket.manager import manager
from app.websocket.handlers import websocket_now_playing
from app.api import auth, health, stats

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

settings = get_settings()


async def periodic_cleanup(shutdown_event: asyncio.Event):
    """
    Periodic cleanup of stale WebSocket connections.
    
    Runs every 60 seconds until shutdown.
    """
    while not shutdown_event.is_set():
        try:
            await asyncio.sleep(60)
            await manager.cleanup_stale_connections()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Cleanup error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management.
    
    Startup:
    - Initialize HTTP client for external APIs
    - Connect to Redis
    - Start cleanup task
    
    Shutdown:
    - Close all WebSocket connections gracefully
    - Close HTTP client
    - Close Redis connection
    """
    # ===== STARTUP =====
    logger.info("Starting VISUALify API...")

    # HTTP client for Spotify API
    app.state.http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(10.0, connect=5.0),
        limits=httpx.Limits(
            max_connections=100,
            max_keepalive_connections=20,
        ),
    )

    # Redis connection (graceful fallback if unavailable)
    redis_client = None
    if settings.redis_url:
        try:
            redis_client = aioredis.from_url(
                settings.redis_url,
                encoding="utf-8",
                decode_responses=True,
            )
            await redis_client.ping()
            logger.info("Redis connected")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
            redis_client = None
    app.state.redis = redis_client

    # Initialize cache layer
    from app.core.cache import init_cache
    init_cache(redis_client)

    # Shutdown event for graceful termination
    app.state.shutdown_event = asyncio.Event()
    manager.set_shutdown_event(app.state.shutdown_event)

    # Start cleanup task
    cleanup_task = asyncio.create_task(
        periodic_cleanup(app.state.shutdown_event)
    )

    logger.info(f"VISUALify API started (debug={settings.debug})")

    yield  # Application runs here

    # ===== SHUTDOWN =====
    logger.info("Shutting down VISUALify API...")

    # Signal shutdown to all tasks
    app.state.shutdown_event.set()

    # Cancel cleanup task
    cleanup_task.cancel()
    try:
        await cleanup_task
    except asyncio.CancelledError:
        pass

    # Close all WebSocket connections gracefully
    await manager.close_all_connections()

    # Close external connections
    await app.state.http_client.aclose()
    if app.state.redis:
        await app.state.redis.close()

    logger.info("Shutdown complete")


# Create FastAPI app
app = FastAPI(
    title="VISUALify API",
    description="Real-time Spotify visualization backend",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if settings.debug else None,
    redoc_url="/redoc" if settings.debug else None,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Custom exception handler
app.add_exception_handler(AppException, app_exception_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global exception handler for unexpected errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch-all for unhandled exceptions."""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "INTERNAL_ERROR",
            "message": "An unexpected error occurred",
        },
    )


# Include routers
app.include_router(health.router)
app.include_router(auth.router)
app.include_router(stats.router)

# WebSocket endpoint
app.add_api_websocket_route("/ws/now-playing", websocket_now_playing)


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": settings.app_name,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs" if settings.debug else "disabled",
    }
