# backend/app/api/deps.py
"""
Shared dependencies for API routes.
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
import httpx

from app.database import get_db
from app.core.security import decode_access_token
from app.models import User

# Security scheme for Swagger UI
security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency to get the current authenticated user.
    
    Validates the JWT token and returns the User model.
    
    Usage:
        @router.get("/example")
        async def example(user: User = Depends(get_current_user)):
            ...
    """
    token = credentials.credentials
    user_id = decode_access_token(token)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await db.get(User, user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account deactivated",
        )

    return user


async def get_redis(request: Request) -> Redis:
    """Get Redis client from app state."""
    return request.app.state.redis


async def get_http_client(request: Request) -> httpx.AsyncClient:
    """Get HTTP client from app state."""
    return request.app.state.http_client


# Type aliases for cleaner dependency injection
CurrentUser = Annotated[User, Depends(get_current_user)]
DbSession = Annotated[AsyncSession, Depends(get_db)]
RedisClient = Annotated[Redis, Depends(get_redis)]
HttpClient = Annotated[httpx.AsyncClient, Depends(get_http_client)]
