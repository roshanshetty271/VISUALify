# backend/app/services/polling_service.py
"""
Per-user Spotify polling service.

Runs as an async task for each connected WebSocket user.
Polls Spotify API and pushes updates to the WebSocket.
"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import TYPE_CHECKING

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import TokenExpiredError, RateLimitedError
from app.services.spotify_service import SpotifyService
from app.services.auth_service import AuthService
from app.models import User, Track
from app.schemas.track import NowPlayingData

if TYPE_CHECKING:
    from app.websocket.manager import UserConnection

logger = logging.getLogger(__name__)
settings = get_settings()


class PollingService:
    """
    Per-user Spotify polling service.
    
    Creates one async task per connected user that:
    1. Polls Spotify for current playback
    2. Fetches audio features for new tracks
    3. Pushes updates via WebSocket
    4. Handles token refresh
    5. Respects rate limits
    """

    def __init__(self, conn: "UserConnection", app_state):
        """
        Initialize polling service for a user connection.
        
        Args:
            conn: UserConnection instance
            app_state: FastAPI app.state with http_client, redis, etc.
        """
        self.conn = conn
        self.app_state = app_state
        self.spotify = SpotifyService(app_state.http_client)
        self._last_track_id: str | None = None
        self._backoff_seconds: int = 0

    async def run(self):
        """
        Main polling loop.
        
        Runs until connection is closed or task is cancelled.
        """
        logger.info(f"Starting polling for user {self.conn.user_id}")

        while not self.app_state.shutdown_event.is_set():
            try:
                await self._poll_once()
                
                # Reset backoff on success
                self._backoff_seconds = 0
                
                # Wait before next poll
                interval = (
                    settings.poll_interval_playing
                    if self.conn.is_playing
                    else settings.poll_interval_idle
                )
                await asyncio.sleep(interval)

            except TokenExpiredError:
                # Refresh token and retry
                await self._handle_token_refresh()

            except RateLimitedError as e:
                # Back off and notify frontend
                await self._handle_rate_limit(e.retry_after)

            except asyncio.CancelledError:
                logger.info(f"Polling cancelled for user {self.conn.user_id}")
                break

            except Exception as e:
                logger.error(f"Polling error for {self.conn.user_id}: {e}")
                # Exponential backoff on errors
                self._backoff_seconds = min(self._backoff_seconds * 2 or 5, 60)
                await asyncio.sleep(self._backoff_seconds)

        logger.info(f"Polling stopped for user {self.conn.user_id}")

    async def _poll_once(self):
        """Execute a single poll cycle."""
        # Get current playback
        data = await self.spotify.get_now_playing(self.conn.spotify_token)

        if data and data.get("item") and data.get("currently_playing_type") == "track":
            # Track is playing
            track_id = data["item"]["id"]
            is_new_track = track_id != self._last_track_id

            if is_new_track:
                self._last_track_id = track_id
                
                # Get audio features (cached in Track model)
                features = await self._get_audio_features(track_id)
                
                # Normalize track data
                track = self.spotify.normalize_track(data["item"])
                audio_features = (
                    self.spotify.normalize_audio_features(features)
                    if features else None
                )

                # Build update payload
                payload = NowPlayingData(
                    track=track,
                    audio_features=audio_features,
                    progress_ms=data.get("progress_ms", 0),
                    duration_ms=data["item"].get("duration_ms", 0),
                    is_playing=data.get("is_playing", False),
                    device_name=data.get("device", {}).get("name"),
                    context_type=data.get("context", {}).get("type") if data.get("context") else None,
                )

                # Send to WebSocket
                await self.conn.send_message({
                    "type": "track_update",
                    "data": payload.model_dump(),
                })

            else:
                # Same track - just send progress update
                await self.conn.send_message({
                    "type": "progress_update",
                    "data": {
                        "progress_ms": data.get("progress_ms", 0),
                        "is_playing": data.get("is_playing", False),
                    },
                })

            self.conn.is_playing = data.get("is_playing", False)

        else:
            # Nothing playing
            if self._last_track_id is not None:
                # Transition from playing to not playing
                self._last_track_id = None
                await self.conn.send_message({
                    "type": "nothing_playing",
                })
            
            self.conn.is_playing = False

    async def _get_audio_features(self, track_id: str) -> dict | None:
        """
        Get audio features, using cache if available.
        
        Audio features never change, so we cache them in the Track model.
        """
        # TODO: Check Track model cache first
        # For now, just fetch from Spotify
        try:
            return await self.spotify.get_audio_features(
                track_id,
                self.conn.spotify_token,
            )
        except Exception as e:
            logger.warning(f"Failed to get audio features for {track_id}: {e}")
            return None

    async def _handle_token_refresh(self):
        """Handle expired token by refreshing."""
        logger.info(f"Refreshing token for user {self.conn.user_id}")

        try:
            # Get database session
            from app.database import get_session_factory
            factory = get_session_factory()
            
            async with factory() as db:
                # Get user
                result = await db.execute(
                    select(User).where(User.id == self.conn.user_id)
                )
                user = result.scalar_one_or_none()

                if not user:
                    await self.conn.send_message({
                        "type": "error",
                        "error": "USER_NOT_FOUND",
                    })
                    return

                # Refresh token
                auth_service = AuthService(
                    db=db,
                    redis=self.app_state.redis,
                    http_client=self.app_state.http_client,
                )
                new_token = await auth_service.refresh_spotify_token(user)
                
                # Update connection with new token
                self.conn.spotify_token = new_token

        except Exception as e:
            logger.error(f"Token refresh failed for {self.conn.user_id}: {e}")
            await self.conn.send_message({
                "type": "error",
                "error": "TOKEN_REFRESH_FAILED",
                "message": str(e),
            })

    async def _handle_rate_limit(self, retry_after: int):
        """Handle Spotify rate limiting."""
        logger.warning(
            f"Rate limited for user {self.conn.user_id}, "
            f"waiting {retry_after}s"
        )

        await self.conn.send_message({
            "type": "rate_limited",
            "data": {"retry_after": retry_after},
        })

        await asyncio.sleep(retry_after)
