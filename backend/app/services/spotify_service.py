# backend/app/services/spotify_service.py
"""
Spotify API client using async httpx.

Mirrors the frontend spotifyClient interface but runs server-side.
"""
import httpx
import json
import logging
from datetime import datetime, timezone

from app.core.exceptions import (
    TokenExpiredError,
    RateLimitedError,
    SpotifyAPIError,
)
from app.schemas.track import Track, AudioFeatures

logger = logging.getLogger(__name__)

SPOTIFY_API_BASE = "https://api.spotify.com/v1"
SPOTIFY_AUTH_BASE = "https://accounts.spotify.com/api"


class SpotifyService:
    """Async Spotify API client."""

    def __init__(self, http_client: httpx.AsyncClient):
        self.client = http_client

    async def _request(
        self,
        method: str,
        endpoint: str,
        access_token: str,
        **kwargs,
    ) -> dict | None:
        """
        Make an authenticated request to Spotify API.
        
        Args:
            method: HTTP method
            endpoint: API endpoint (without base URL)
            access_token: Spotify access token
            **kwargs: Additional httpx request arguments
            
        Returns:
            JSON response or None for 204 No Content
            
        Raises:
            TokenExpiredError: If token is expired
            RateLimitedError: If rate limited
            SpotifyAPIError: For other API errors
        """
        url = f"{SPOTIFY_API_BASE}{endpoint}"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
        }

        try:
            response = await self.client.request(
                method,
                url,
                headers=headers,
                **kwargs,
            )
        except httpx.RequestError as e:
            logger.error(f"Spotify request failed: {e}")
            raise SpotifyAPIError(500, str(e))

        # Handle specific status codes
        if response.status_code == 204:
            return None

        if response.status_code == 401:
            raise TokenExpiredError()

        if response.status_code == 429:
            retry_after = int(response.headers.get("Retry-After", 30))
            logger.warning(f"Spotify rate limited, retry after {retry_after}s")
            raise RateLimitedError(retry_after)

        if response.status_code == 403:
            raise SpotifyAPIError(403, "Spotify Premium required")

        if response.status_code == 404:
            raise SpotifyAPIError(404, "Resource not found")

        if not response.is_success:
            raise SpotifyAPIError(
                response.status_code,
                f"API error: {response.text[:200]}",
            )

        # Parse JSON response
        if not response.text:
            return None

        return response.json()

    # === NOW PLAYING ===

    async def get_now_playing(
        self,
        access_token: str,
    ) -> dict | None:
        """
        Get currently playing track.
        
        Returns:
            Raw Spotify response or None if nothing playing
        """
        return await self._request(
            "GET",
            "/me/player/currently-playing",
            access_token,
        )

    # === AUDIO FEATURES ===

    async def get_audio_features(
        self,
        track_id: str,
        access_token: str,
    ) -> dict | None:
        """
        Get audio features for a track.
        
        Note: Audio features never change, so should be cached.
        
        Returns:
            Audio features dict or None if not available
        """
        try:
            return await self._request(
                "GET",
                f"/audio-features/{track_id}",
                access_token,
            )
        except SpotifyAPIError as e:
            if e.status_code == 404:
                # Some tracks don't have audio features
                return None
            raise

    # === USER PROFILE ===

    async def get_user_profile(
        self,
        access_token: str,
    ) -> dict:
        """Get current user's Spotify profile."""
        return await self._request("GET", "/me", access_token)

    # === TOKEN OPERATIONS ===

    async def exchange_code(
        self,
        code: str,
        redirect_uri: str,
        client_id: str,
        client_secret: str,
    ) -> dict:
        """
        Exchange authorization code for tokens.
        
        Returns:
            Dict with access_token, refresh_token, expires_in
        """
        response = await self.client.post(
            f"{SPOTIFY_AUTH_BASE}/token",
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if not response.is_success:
            raise SpotifyAPIError(
                response.status_code,
                f"Token exchange failed: {response.text[:200]}",
            )

        return response.json()

    async def refresh_token(
        self,
        refresh_token: str,
        client_id: str,
        client_secret: str,
    ) -> dict:
        """
        Refresh an expired access token.
        
        Returns:
            Dict with access_token, (optionally new refresh_token), expires_in
        """
        response = await self.client.post(
            f"{SPOTIFY_AUTH_BASE}/token",
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )

        if not response.is_success:
            raise SpotifyAPIError(
                response.status_code,
                f"Token refresh failed: {response.text[:200]}",
            )

        return response.json()

    # === HELPERS ===

    @staticmethod
    def normalize_track(spotify_track: dict) -> Track:
        """
        Normalize Spotify track to our Track schema.
        
        Matches the frontend normalizeTrack() function.
        """
        # Get best album art
        images = spotify_track.get("album", {}).get("images", [])
        album_art = images[0]["url"] if images else None

        # Get primary artist
        artists = spotify_track.get("artists", [])
        artist = artists[0] if artists else {"id": "", "name": "Unknown"}

        return Track(
            id=spotify_track["id"],
            name=spotify_track["name"],
            artist=artist["name"],
            artistId=artist["id"],
            album=spotify_track.get("album", {}).get("name", ""),
            albumId=spotify_track.get("album", {}).get("id", ""),
            albumArt=album_art,
            duration=spotify_track.get("duration_ms", 0),
            previewUrl=spotify_track.get("preview_url"),
        )

    @staticmethod
    def normalize_audio_features(features: dict) -> AudioFeatures:
        """Normalize Spotify audio features to our schema."""
        return AudioFeatures(
            id=features["id"],
            energy=features.get("energy"),
            tempo=features.get("tempo"),
            valence=features.get("valence"),
            danceability=features.get("danceability"),
            acousticness=features.get("acousticness"),
            instrumentalness=features.get("instrumentalness"),
            liveness=features.get("liveness"),
            speechiness=features.get("speechiness"),
            loudness=features.get("loudness"),
            key=features.get("key"),
            mode=features.get("mode"),
            time_signature=features.get("time_signature"),
        )
