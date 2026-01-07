# backend/app/schemas/auth.py
"""Authentication schemas."""
from pydantic import BaseModel


class TokenExchangeRequest(BaseModel):
    """Request to exchange NextAuth token for backend JWT."""
    nextauth_token: str


class TokenExchangeResponse(BaseModel):
    """Response with backend JWT."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user_id: str
    display_name: str | None = None


class SpotifyTokens(BaseModel):
    """Spotify OAuth tokens."""
    access_token: str
    refresh_token: str
    expires_in: int


class UserProfile(BaseModel):
    """User profile from Spotify."""
    id: str
    display_name: str | None
    email: str | None
    images: list[dict] | None
    country: str | None
    product: str | None


class AuthCallbackRequest(BaseModel):
    """OAuth callback with authorization code."""
    code: str
    state: str | None = None
