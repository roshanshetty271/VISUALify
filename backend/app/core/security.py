# backend/app/core/security.py
"""
JWT token utilities for API authentication.
"""
from datetime import datetime, timedelta, timezone
from jose import jwt, JWTError
import secrets
import logging

logger = logging.getLogger(__name__)

# Lazy settings access
_settings = None


def _get_settings():
    global _settings
    if _settings is None:
        from app.config import get_settings
        _settings = get_settings()
    return _settings


def create_access_token(
    user_id: str,
    expires_delta: timedelta | None = None,
) -> str:
    """
    Create a JWT access token for API authentication.
    
    Args:
        user_id: User's UUID as string
        expires_delta: Optional custom expiry time
        
    Returns:
        Encoded JWT token string
    """
    settings = _get_settings()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.jwt_expire_minutes
        )

    payload = {
        "sub": user_id,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "jti": secrets.token_urlsafe(16),  # Unique token ID
    }
    
    return jwt.encode(
        payload,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_access_token(token: str) -> str | None:
    """
    Decode and validate a JWT token.
    
    Args:
        token: JWT token string
        
    Returns:
        User ID if valid, None otherwise
    """
    settings = _get_settings()
    
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        user_id: str | None = payload.get("sub")
        return user_id
    except JWTError as e:
        logger.debug(f"JWT decode failed: {e}")
        return None


def generate_state_token() -> str:
    """Generate a secure random state for OAuth CSRF protection."""
    return secrets.token_urlsafe(32)
