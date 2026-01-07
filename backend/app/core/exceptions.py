# backend/app/core/exceptions.py
"""
Custom exceptions for the application.
"""
from fastapi import Request
from fastapi.responses import JSONResponse


class AppException(Exception):
    """Base exception for application errors."""

    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = 400,
        details: dict | None = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class TokenExpiredError(AppException):
    """Spotify access token has expired."""
    
    def __init__(self):
        super().__init__(
            message="Spotify token expired",
            code="TOKEN_EXPIRED",
            status_code=401,
        )


class TokenRefreshError(AppException):
    """Failed to refresh Spotify token."""
    
    def __init__(self, reason: str = "Unknown error"):
        super().__init__(
            message=f"Failed to refresh token: {reason}",
            code="TOKEN_REFRESH_FAILED",
            status_code=401,
        )


class RateLimitedError(AppException):
    """Rate limited by Spotify API."""
    
    def __init__(self, retry_after: int = 30):
        super().__init__(
            message=f"Rate limited, retry after {retry_after}s",
            code="RATE_LIMITED",
            status_code=429,
            details={"retry_after": retry_after},
        )
        self.retry_after = retry_after


class SpotifyAPIError(AppException):
    """Generic Spotify API error."""
    
    def __init__(self, status_code: int, message: str):
        super().__init__(
            message=f"Spotify API error: {message}",
            code="SPOTIFY_ERROR",
            status_code=status_code,
        )


class AuthenticationError(AppException):
    """Authentication failed."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            code="AUTH_ERROR",
            status_code=401,
        )


class NotFoundError(AppException):
    """Resource not found."""
    
    def __init__(self, resource: str):
        super().__init__(
            message=f"{resource} not found",
            code="NOT_FOUND",
            status_code=404,
        )


class WebSocketAuthError(AppException):
    """WebSocket authentication failed."""
    
    def __init__(self, reason: str = "Invalid token"):
        super().__init__(
            message=f"WebSocket auth failed: {reason}",
            code="WS_AUTH_ERROR",
            status_code=4001,  # Custom WebSocket close code
        )


# Exception handler for FastAPI
async def app_exception_handler(request: Request, exc: AppException) -> JSONResponse:
    """Global exception handler for AppException."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.code,
            "message": exc.message,
            "details": exc.details,
        },
    )
