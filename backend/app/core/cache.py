"""
Redis caching utility with graceful fallback.

Reuses the app's existing Redis connection. If Redis is unavailable,
all operations silently return None/False and queries fall through
to PostgreSQL.
"""
import json
import logging
from typing import Any, Optional

from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_redis: Optional[Redis] = None


def init_cache(redis_client: Optional[Redis]) -> None:
    """Store a reference to the app's Redis client for cache operations."""
    global _redis
    _redis = redis_client
    if _redis:
        logger.info("Redis cache initialized")
    else:
        logger.warning("Redis cache disabled (no client provided)")


async def cache_get(key: str) -> Optional[Any]:
    """Get a JSON-serialized value from cache. Returns None on miss or error."""
    if not _redis:
        return None
    try:
        data = await _redis.get(key)
        if data:
            return json.loads(data)
    except Exception as e:
        logger.debug(f"Cache get error for {key}: {e}")
    return None


async def cache_set(key: str, value: Any, ttl: int = 60) -> bool:
    """Set a JSON-serialized value in cache with TTL (seconds)."""
    if not _redis:
        return False
    try:
        serialized = json.dumps(value, default=str)
        await _redis.set(key, serialized, ex=ttl)
        return True
    except Exception as e:
        logger.debug(f"Cache set error for {key}: {e}")
        return False


async def cache_delete_pattern(pattern: str) -> int:
    """Delete all keys matching a glob pattern using SCAN."""
    if not _redis:
        return 0
    try:
        keys: list[str] = []
        async for key in _redis.scan_iter(match=pattern):
            keys.append(key)
        if keys:
            return await _redis.delete(*keys)
    except Exception as e:
        logger.debug(f"Cache delete error for {pattern}: {e}")
    return 0


async def invalidate_user_cache(user_id) -> int:
    """Invalidate all cached stats for a specific user."""
    return await cache_delete_pattern(f"stats:{user_id}:*")


async def cache_health() -> str:
    """Check cache health for readiness probes."""
    if not _redis:
        return "not configured"
    try:
        await _redis.ping()
        return "ok"
    except Exception as e:
        return f"error: {str(e)[:50]}"
