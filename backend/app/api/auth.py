# backend/app/api/auth.py
"""
Authentication endpoints.

The main flow is:
1. Frontend uses NextAuth for Spotify OAuth
2. Frontend calls POST /api/auth/token with NextAuth session
3. Backend creates its own JWT for API access
4. Frontend uses backend JWT for WebSocket and API calls
"""
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Request, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.rate_limit import limiter
from app.core.security import create_access_token
from app.database import get_db
from app.models import User
from app.services.auth_service import AuthService
from app.services.spotify_service import SpotifyService
from app.api.deps import CurrentUser, RedisClient, HttpClient
from app.schemas.auth import TokenExchangeRequest, TokenExchangeResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])
settings = get_settings()


@router.post("/token", response_model=TokenExchangeResponse)
@limiter.limit("20/minute")
async def exchange_token(
    request: Request,
    body: TokenExchangeRequest,
    db: AsyncSession = Depends(get_db),
    redis: RedisClient = None,
    http_client: HttpClient = None,
):
    """
    Exchange NextAuth session token for backend JWT.
    
    This endpoint is called by the frontend after NextAuth authentication.
    It validates the Spotify token and creates a backend JWT.
    
    Request:
        {"nextauth_token": "spotify_access_token_from_nextauth_session"}
    
    Response:
        {"access_token": "backend_jwt", "token_type": "bearer", "expires_in": 86400, ...}
    """
    spotify_token = body.nextauth_token
    
    if not spotify_token:
        raise HTTPException(status_code=400, detail="Token is required")

    # Validate token by fetching user profile from Spotify
    spotify = SpotifyService(http_client)
    
    try:
        profile = await spotify.get_user_profile(spotify_token)
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Invalid Spotify token: {str(e)[:100]}",
        )

    spotify_id = profile["id"]

    # Get or create user
    auth_service = AuthService(db, redis, http_client)
    
    # For token exchange, we don't have refresh token
    # We'll get it from existing user or this is a new session
    result = await db.execute(
        select(User).where(User.spotify_id == spotify_id)
    )
    existing_user = result.scalar_one_or_none()

    if existing_user:
        # Update access token (keep existing refresh token)
        existing_user.access_token = spotify_token
        existing_user.token_expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
        existing_user.is_connected = True
        existing_user.update_last_seen()
        
        # Update profile
        existing_user.display_name = profile.get("display_name")
        existing_user.email = profile.get("email")
        existing_user.country = profile.get("country")
        existing_user.product = profile.get("product")
        if profile.get("images"):
            existing_user.avatar_url = profile["images"][0].get("url")
        
        user = existing_user
    else:
        # Create new user (no refresh token - will get it on next full OAuth)
        user = User(
            spotify_id=spotify_id,
            access_token=spotify_token,
            token_expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            display_name=profile.get("display_name"),
            email=profile.get("email"),
            country=profile.get("country"),
            product=profile.get("product"),
        )
        if profile.get("images"):
            user.avatar_url = profile["images"][0].get("url")
        db.add(user)

    await db.commit()
    await db.refresh(user)

    # Create backend JWT
    backend_token = create_access_token(str(user.id))
    expires_in = settings.jwt_expire_minutes * 60

    return TokenExchangeResponse(
        access_token=backend_token,
        token_type="bearer",
        expires_in=expires_in,
        user_id=str(user.id),
        display_name=user.display_name,
    )


@router.get("/me")
async def get_current_user_info(user: CurrentUser):
    """
    Get current user information.
    
    Requires authentication via backend JWT.
    """
    return {
        "id": str(user.id),
        "spotify_id": user.spotify_id,
        "display_name": user.display_name,
        "email": user.email,
        "avatar_url": user.avatar_url,
        "country": user.country,
        "product": user.product,
        "is_connected": user.is_connected,
        "created_at": user.created_at.isoformat(),
        "total_plays": user.total_plays,
        "total_minutes": user.total_minutes,
        "settings": user.settings,
    }


@router.post("/logout")
@limiter.limit("10/minute")
async def logout(
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Log out user.
    
    Marks user as disconnected. Token will naturally expire.
    """
    user.is_connected = False
    await db.commit()

    return {"status": "logged_out"}


@router.delete("/account")
@limiter.limit("5/minute")
async def delete_account(
    request: Request,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """
    Delete user account and all data (GDPR compliance).
    
    This is irreversible!
    """
    await db.delete(user)
    await db.commit()

    return {"status": "deleted"}
