# backend/app/models/user.py
"""
User model with encrypted Spotify tokens.
"""
from sqlalchemy import String, DateTime, Integer, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from datetime import datetime, timedelta, timezone
import uuid

from app.models.base import Base
from app.core.encryption import encrypt_token, decrypt_token


class User(Base):
    """User model with encrypted Spotify tokens."""
    
    __tablename__ = "users"

    # Primary key
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Spotify identifiers
    spotify_id: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    # Profile info (from Spotify)
    display_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    avatar_url: Mapped[str | None] = mapped_column(Text)
    country: Mapped[str | None] = mapped_column(String(2))
    product: Mapped[str | None] = mapped_column(String(50))  # free, premium

    # ENCRYPTED token storage
    # Stored as ciphertext - use properties to access plaintext
    _access_token_encrypted: Mapped[str | None] = mapped_column(
        "access_token_encrypted",
        Text,
    )
    _refresh_token_encrypted: Mapped[str | None] = mapped_column(
        "refresh_token_encrypted",
        Text,
    )
    token_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    # Account status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_connected: Mapped[bool] = mapped_column(Boolean, default=True)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    last_seen_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    # Aggregated stats (denormalized for fast queries)
    total_plays: Mapped[int] = mapped_column(Integer, default=0)
    total_minutes: Mapped[int] = mapped_column(Integer, default=0)

    # User preferences
    settings: Mapped[dict] = mapped_column(
        JSONB,
        default=lambda: {
            "theme": "spotify",
            "animation_speed": 1.0,
            "show_stats": True,
        },
    )

    # Relationships
    plays = relationship(
        "Play",
        back_populates="user",
        cascade="all, delete-orphan",
        lazy="dynamic",
    )

    # === Property accessors for encrypted tokens ===
    
    @property
    def access_token(self) -> str | None:
        """Decrypt and return access token."""
        if not self._access_token_encrypted:
            return None
        return decrypt_token(self._access_token_encrypted)

    @access_token.setter
    def access_token(self, value: str | None):
        """Encrypt and store access token."""
        if value:
            self._access_token_encrypted = encrypt_token(value)
        else:
            self._access_token_encrypted = None

    @property
    def refresh_token(self) -> str | None:
        """Decrypt and return refresh token."""
        if not self._refresh_token_encrypted:
            return None
        return decrypt_token(self._refresh_token_encrypted)

    @refresh_token.setter
    def refresh_token(self, value: str | None):
        """Encrypt and store refresh token."""
        if value:
            self._refresh_token_encrypted = encrypt_token(value)
        else:
            self._refresh_token_encrypted = None

    def is_token_expired(self, buffer_minutes: int = 5) -> bool:
        """
        Check if access token is expired or expiring soon.
        
        Args:
            buffer_minutes: Minutes before expiry to consider expired
            
        Returns:
            True if token is expired or will expire within buffer
        """
        if not self.token_expires_at:
            return True
        threshold = datetime.now(timezone.utc) + timedelta(minutes=buffer_minutes)
        return self.token_expires_at <= threshold

    def update_last_seen(self):
        """Update last_seen_at timestamp."""
        self.last_seen_at = datetime.now(timezone.utc)

    def __repr__(self) -> str:
        return f"<User {self.display_name or self.spotify_id}>"
