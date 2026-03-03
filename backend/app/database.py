# backend/app/database.py
"""
SQLAlchemy async database configuration.

Supports both long-lived (uvicorn) and serverless (Vercel) runtimes.
In serverless mode (ENVIRONMENT=production + no persistent process),
NullPool is used to avoid leaked connections across cold starts.
"""
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    async_sessionmaker,
    AsyncSession,
)
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

_engine = None
_session_factory = None

_is_serverless = os.environ.get("VERCEL", "") == "1"


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


def get_engine():
    """Get or create the async engine."""
    global _engine
    if _engine is None:
        from app.config import get_settings
        settings = get_settings()

        pool_kwargs = (
            {"poolclass": NullPool}
            if _is_serverless
            else {
                "pool_size": 5,
                "max_overflow": 10,
                "pool_recycle": 300,
            }
        )

        _engine = create_async_engine(
            settings.database_url,
            echo=settings.debug,
            pool_pre_ping=True,
            **pool_kwargs,
        )
    return _engine


def get_session_factory():
    """Get or create the session factory."""
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(
            get_engine(),
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    
    Yields:
        AsyncSession: Database session
        
    Usage:
        @router.get("/example")
        async def example(db: AsyncSession = Depends(get_db)):
            ...
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


async def close_db():
    """Close database connections."""
    global _engine
    if _engine:
        await _engine.dispose()
        _engine = None
