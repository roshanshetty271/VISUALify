# backend/app/api/health.py
"""
Health check endpoints for load balancers and orchestrators.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.websocket.manager import manager

router = APIRouter(tags=["Health"])


@router.get("/health")
async def health_check():
    """
    Basic liveness check.
    
    Used by load balancers to check if the server is running.
    Always returns 200 if the server can respond.
    """
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "visualify-api",
    }


@router.get("/health/ready")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
):
    """
    Readiness check with dependency status.
    
    Used by orchestrators to know when to route traffic.
    Checks database connectivity.
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

    # Check Redis cache
    from app.core.cache import cache_health
    checks["redis"] = await cache_health()

    # WebSocket stats (informational)
    checks["websocket_connections"] = manager.connection_count

    status_code = 200 if overall_status == "ready" else 503

    return {
        "status": overall_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "checks": checks,
    }
