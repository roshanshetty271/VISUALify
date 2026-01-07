# backend/app/models/play.py
"""
Play model - records each track play for listening history.
"""
from sqlalchemy import String, Integer, Boolean, ForeignKey, DECIMAL, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timezone
import uuid

from app.models.base import Base


class Play(Base):
    """Records each track play for listening history and analytics."""
    
    __tablename__ = "plays"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )

    # Foreign keys
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    track_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tracks.id"),
        index=True,
        nullable=False,
    )

    # Timing
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        default=lambda: datetime.now(timezone.utc),
    )
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    duration_played_ms: Mapped[int | None] = mapped_column(Integer)

    # Context (where the track was played from)
    context_type: Mapped[str | None] = mapped_column(String(50))  # album, playlist, artist
    context_uri: Mapped[str | None] = mapped_column(String(255))
    device_name: Mapped[str | None] = mapped_column(String(255))
    device_type: Mapped[str | None] = mapped_column(String(50))

    # Snapshot of audio features at time of play (for fast queries)
    energy: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    valence: Mapped[float | None] = mapped_column(DECIMAL(4, 3))
    tempo: Mapped[float | None] = mapped_column(DECIMAL(6, 2))

    # Flags
    skipped: Mapped[bool] = mapped_column(Boolean, default=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    user = relationship("User", back_populates="plays")
    track = relationship("Track")

    def mark_completed(self, duration_played_ms: int):
        """Mark play as completed with duration."""
        self.ended_at = datetime.now(timezone.utc)
        self.duration_played_ms = duration_played_ms
        self.completed = True
        # Skipped if played less than 30 seconds
        self.skipped = duration_played_ms < 30000

    def __repr__(self) -> str:
        return f"<Play {self.track_id} by {self.user_id} at {self.started_at}>"
