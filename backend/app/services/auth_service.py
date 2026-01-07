# backend/app/services/auth_service.py
"""
Authentication service with distributed token refresh locking.

Handles:
- Token exchange from NextAuth
- Spotify token refresh with race condition prevention
- User upsert
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone

import httpx
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import TokenRefreshError, AuthenticationError
from app.core.security import create_access_token
from app.models import User
from app.services.spotify_service import SpotifyService

logger = logging.getLogger(__name__)
settings = get_settings()


class AuthService:
    """Authentication and token management service."""

    def __init__(
        self,
        db: AsyncSession,
        redis: Redis,
        http_client: httpx.AsyncClient,
    ):
        self.db = db
        self.redis = redis
        self.spotify = SpotifyService(http_client)

    async def get_or_create_user(
        self,
        spotify_id: str,
        access_token: str,
        refresh_token: str,
        expires_at: datetime,
        profile: dict | None = None,
    ) -> User:
        """
        Get existing user or create new one.
        
        Args:
            spotify_id: Spotify user ID
            access_token: Spotify access token
            refresh_token: Spotify refresh token
            expires_at: Token expiry datetime
            profile: Optional user profile data
            
        Returns:
            User instance
        """
        # Try to find existing user
        result = await self.db.execute(
            select(User).where(User.spotify_id == spotify_id)
        )
        user = result.scalar_one_or_none()

        if user:
            # Update tokens and last seen
            user.access_token = access_token
            user.refresh_token = refresh_token
            user.token_expires_at = expires_at
            user.is_connected = True
            user.update_last_seen()
            
            # Update profile if provided
            if profile:
                user.display_name = profile.get("display_name")
                user.email = profile.get("email")
                user.country = profile.get("country")
                user.product = profile.get("product")
                if profile.get("images"):
                    user.avatar_url = profile["images"][0].get("url")
        else:
            # Create new user
            user = User(
                spotify_id=spotify_id,
                access_token=access_token,
                refresh_token=refresh_token,
                token_expires_at=expires_at,
            )
            
            if profile:
                user.display_name = profile.get("display_name")
                user.email = profile.get("email")
                user.country = profile.get("country")
                user.product = profile.get("product")
                if profile.get("images"):
                    user.avatar_url = profile["images"][0].get("url")

            self.db.add(user)

        await self.db.flush()
        return user

    async def refresh_spotify_token(self, user: User) -> str:
        """
        Refresh Spotify token with DISTRIBUTED LOCK.
        
        This prevents race conditions when multiple requests detect
        an expired token simultaneously:
        
        1. Request A and B both see expired token
        2. Both try to refresh at the same time
        3. A gets new token, saves to DB
        4. B gets ANOTHER new token, overwrites A's
        5. A's subsequent requests fail
        
        Solution: Redis lock ensures only one refresh at a time.
        
        Args:
            user: User instance with expired token
            
        Returns:
            New access token
            
        Raises:
            TokenRefreshError: If refresh fails
        """
        lock_key = f"token_refresh:{user.id}"
        lock_acquired = False

        try:
            # Try to acquire distributed lock (30 second TTL prevents deadlock)
            lock_acquired = await self.redis.set(
                lock_key,
                value="locked",
                ex=30,    # Expires in 30 seconds
                nx=True,  # Only set if NOT exists
            )

            if not lock_acquired:
                # Another request is refreshing - wait for it
                logger.info(f"Waiting for token refresh by another request for user {user.id}")
                return await self._wait_for_refresh(user)

            # We have the lock - do the refresh
            logger.info(f"Acquired lock, refreshing token for user {user.id}")

            if not user.refresh_token:
                raise TokenRefreshError("No refresh token - user must re-authenticate")

            # Call Spotify token endpoint
            tokens = await self.spotify.refresh_token(
                refresh_token=user.refresh_token,
                client_id=settings.spotify_client_id,
                client_secret=settings.spotify_client_secret,
            )

            # Update user tokens (encryption happens automatically via property)
            user.access_token = tokens["access_token"]
            user.token_expires_at = datetime.now(timezone.utc) + timedelta(
                seconds=tokens.get("expires_in", 3600)
            )

            # CRITICAL: Spotify may rotate refresh tokens
            if "refresh_token" in tokens:
                logger.info(f"Spotify rotated refresh token for user {user.id}")
                user.refresh_token = tokens["refresh_token"]

            await self.db.commit()
            return user.access_token

        except Exception as e:
            if not isinstance(e, TokenRefreshError):
                logger.error(f"Token refresh failed for user {user.id}: {e}")
                raise TokenRefreshError(str(e))
            raise

        finally:
            # Always release lock if we acquired it
            if lock_acquired:
                await self.redis.delete(lock_key)

    async def _wait_for_refresh(
        self,
        user: User,
        max_wait_seconds: int = 10,
    ) -> str:
        """
        Wait for another request to complete token refresh.
        
        Args:
            user: User instance
            max_wait_seconds: Maximum time to wait
            
        Returns:
            New access token
            
        Raises:
            TokenRefreshError: If timeout waiting
        """
        for _ in range(max_wait_seconds * 2):  # Check every 500ms
            await asyncio.sleep(0.5)

            # Reload user from database
            await self.db.refresh(user)

            # Check if token is now valid
            if not user.is_token_expired():
                return user.access_token

        raise TokenRefreshError("Timeout waiting for token refresh")

    async def get_valid_token(self, user: User) -> str:
        """
        Get a valid Spotify access token, refreshing if needed.
        
        Args:
            user: User instance
            
        Returns:
            Valid access token
        """
        if user.is_token_expired():
            return await self.refresh_spotify_token(user)
        return user.access_token

    def create_backend_token(self, user: User) -> tuple[str, int]:
        """
        Create a JWT for backend API authentication.
        
        Args:
            user: User instance
            
        Returns:
            Tuple of (token, expires_in_seconds)
        """
        token = create_access_token(str(user.id))
        return token, settings.jwt_expire_minutes * 60
