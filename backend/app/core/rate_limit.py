# backend/app/core/rate_limit.py
"""
Rate limiting configuration using slowapi.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request
from fastapi.responses import JSONResponse

# Create limiter instance
# Storage will be set in main.py after Redis is initialized
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100/minute"],
)


async def rate_limit_exceeded_handler(
    request: Request,
    exc: RateLimitExceeded,
) -> JSONResponse:
    """Custom handler for rate limit exceeded."""
    return JSONResponse(
        status_code=429,
        content={
            "error": "RATE_LIMITED",
            "message": f"Too many requests: {exc.detail}",
            "details": {
                "retry_after": 60,
            },
        },
    )
