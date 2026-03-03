# backend/app/api/__init__.py
"""API route handlers."""
from . import auth, health, stats

__all__ = ["auth", "health", "stats"]
