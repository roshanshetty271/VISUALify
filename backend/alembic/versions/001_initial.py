# backend/alembic/versions/001_initial.py
"""Initial migration - users, tracks, plays

Revision ID: 001
Revises: 
Create Date: 2024-01-01

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '001'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === USERS TABLE ===
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('spotify_id', sa.String(255), nullable=False),
        sa.Column('display_name', sa.String(255), nullable=True),
        sa.Column('email', sa.String(255), nullable=True),
        sa.Column('avatar_url', sa.Text(), nullable=True),
        sa.Column('country', sa.String(2), nullable=True),
        sa.Column('product', sa.String(50), nullable=True),
        sa.Column('access_token_encrypted', sa.Text(), nullable=True),
        sa.Column('refresh_token_encrypted', sa.Text(), nullable=True),
        sa.Column('token_expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_connected', sa.Boolean(), nullable=False, default=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('last_seen_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('total_plays', sa.Integer(), nullable=False, default=0),
        sa.Column('total_minutes', sa.Integer(), nullable=False, default=0),
        sa.Column('settings', postgresql.JSONB(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_users_spotify_id', 'users', ['spotify_id'], unique=True)

    # === TRACKS TABLE ===
    op.create_table(
        'tracks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('spotify_id', sa.String(255), nullable=False),
        sa.Column('name', sa.String(500), nullable=False),
        sa.Column('artist_name', sa.String(500), nullable=False),
        sa.Column('artist_id', sa.String(255), nullable=True),
        sa.Column('album_name', sa.String(500), nullable=True),
        sa.Column('album_id', sa.String(255), nullable=True),
        sa.Column('album_art_url', sa.Text(), nullable=True),
        sa.Column('duration_ms', sa.Integer(), nullable=False),
        sa.Column('popularity', sa.Integer(), nullable=True),
        sa.Column('preview_url', sa.Text(), nullable=True),
        sa.Column('is_local', sa.Boolean(), nullable=False, default=False),
        # Audio features
        sa.Column('energy', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('tempo', sa.DECIMAL(6, 2), nullable=True),
        sa.Column('valence', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('danceability', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('acousticness', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('instrumentalness', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('liveness', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('speechiness', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('loudness', sa.DECIMAL(5, 2), nullable=True),
        sa.Column('key', sa.Integer(), nullable=True),
        sa.Column('mode', sa.Integer(), nullable=True),
        sa.Column('time_signature', sa.Integer(), nullable=True),
        sa.Column('genres', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('primary_genre', sa.String(100), nullable=True),
        sa.Column('features_cached', sa.Boolean(), nullable=False, default=False),
        sa.Column('cached_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_tracks_spotify_id', 'tracks', ['spotify_id'], unique=True)

    # === PLAYS TABLE ===
    op.create_table(
        'plays',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('track_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('ended_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('duration_played_ms', sa.Integer(), nullable=True),
        sa.Column('context_type', sa.String(50), nullable=True),
        sa.Column('context_uri', sa.String(255), nullable=True),
        sa.Column('device_name', sa.String(255), nullable=True),
        sa.Column('device_type', sa.String(50), nullable=True),
        # Snapshot of audio features
        sa.Column('energy', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('valence', sa.DECIMAL(4, 3), nullable=True),
        sa.Column('tempo', sa.DECIMAL(6, 2), nullable=True),
        sa.Column('skipped', sa.Boolean(), nullable=False, default=False),
        sa.Column('completed', sa.Boolean(), nullable=False, default=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['track_id'], ['tracks.id']),
    )
    op.create_index('ix_plays_user_id', 'plays', ['user_id'])
    op.create_index('ix_plays_track_id', 'plays', ['track_id'])
    op.create_index('ix_plays_started_at', 'plays', ['started_at'])


def downgrade() -> None:
    op.drop_table('plays')
    op.drop_table('tracks')
    op.drop_table('users')
