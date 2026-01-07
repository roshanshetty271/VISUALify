# backend/app/models/track.py
"""
Track model with cached audio features.
Audio features are permanent - they never change for a track.
"""
from sqlalchemy import String, Integer, Text, Boolean, DECIMAL, ARRAY, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.models.base import Base


class Track(Base):
    """Track model with cached Spotify audio features."""
    
    __tablename__ = "tracks"

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

    # Basic info
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    artist_name: Mapped[str] = mapped_column(String(500), nullable=False)
    artist_id: Mapped[str | None] = mapped_column(String(255))
    album_name: Mapped[str | None] = mapped_column(String(500))
    album_id: Mapped[str | None] = mapped_column(String(255))
    album_art_url: Mapped[str | None] = mapped_column(Text)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    popularity: Mapped[int | None] = mapped_column(Integer)
    preview_url: Mapped[str | None] = mapped_column(Text)
    is_local: Mapped[bool] = mapped_column(Boolean, default=False)

    # === AUDIO FEATURES (cached from Spotify - NEVER CHANGE) ===
    # Values are 0.0 to 1.0 unless otherwise noted
    energy: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    tempo: Mapped[float | None] = mapped_column(DECIMAL(6, 2))  # BPM
    valence: Mapped[float | None] = mapped_column(DECIMAL(4, 3))  # Happiness
    danceability: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    acousticness: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    instrumentalness: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    liveness: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    speechiness: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    loudness: Mapped[float | None] = mapped_column(DECIMAL(5, 2))  # dB (-60 to 0)
    key: Mapped[int | None] = mapped_column(Integer)  # 0-11 (C to B)
    mode: Mapped[int | None] = mapped_column(Integer)  # 0=minor, 1=major
    time_signature: Mapped[int | None] = mapped_column(Integer)  # 3-7

    # Genre info (from artist)
    genres: Mapped[list[str] | None] = mapped_column(ARRAY(String))
    primary_genre: Mapped[str | None] = mapped_column(String(100))

    # Cache metadata
    features_cached: Mapped[bool] = mapped_column(Boolean, default=False)
    cached_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )

    def has_audio_features(self) -> bool:
        """Check if audio features have been cached."""
        return self.features_cached and self.energy is not None

    def to_audio_features_dict(self) -> dict | None:
        """
        Convert to dict matching frontend AudioFeatures type.
        
        Returns:
            Dict with audio features or None if not cached
        """
        if not self.has_audio_features():
            return None
            
        return {
            "id": self.spotify_id,
            "energy": float(self.energy) if self.energy else None,
            "tempo": float(self.tempo) if self.tempo else None,
            "valence": float(self.valence) if self.valence else None,
            "danceability": float(self.danceability) if self.danceability else None,
            "acousticness": float(self.acousticness) if self.acousticness else None,
            "instrumentalness": float(self.instrumentalness) if self.instrumentalness else None,
            "liveness": float(self.liveness) if self.liveness else None,
            "speechiness": float(self.speechiness) if self.speechiness else None,
            "loudness": float(self.loudness) if self.loudness else None,
            "key": self.key,
            "mode": self.mode,
            "time_signature": self.time_signature,
        }

    def __repr__(self) -> str:
        return f"<Track {self.name} by {self.artist_name}>"
