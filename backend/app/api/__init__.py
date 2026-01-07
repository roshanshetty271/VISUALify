# backend/app/api/__init__.py
"""API route handlers."""
from . import auth, health

__all__ = ["auth", "health"]
