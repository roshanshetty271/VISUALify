# backend/app/schemas/__init__.py
"""Pydantic schemas for request/response validation."""
from .auth import (
    TokenExchangeRequest,
    TokenExchangeResponse,
    AuthCallbackRequest,
    SpotifyTokens,
    UserProfile,
)
from .track import (
    Track,
    AudioFeatures,
    NowPlayingData,
    WebSocketMessage,
)

__all__ = [
    "TokenExchangeRequest",
    "TokenExchangeResponse",
    "AuthCallbackRequest",
    "SpotifyTokens",
    "UserProfile",
    "Track",
    "AudioFeatures",
    "NowPlayingData",
    "WebSocketMessage",
]
