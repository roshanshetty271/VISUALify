# backend/app/schemas/track.py
"""
Track schemas matching frontend TypeScript types.

These should match the shapes in src/types/spotify.ts
"""
from pydantic import BaseModel


class TrackImage(BaseModel):
    """Album art image."""
    url: str
    height: int | None = None
    width: int | None = None


class TrackArtist(BaseModel):
    """Track artist info."""
    id: str
    name: str


class Track(BaseModel):
    """
    Track schema matching frontend Track type.
    
    This is the normalized track shape used throughout the app.
    """
    id: str
    name: str
    artist: str
    artistId: str
    album: str
    albumId: str
    albumArt: str | None = None
    duration: int  # Duration in ms
    previewUrl: str | None = None

    class Config:
        from_attributes = True


class AudioFeatures(BaseModel):
    """
    Audio features schema matching frontend AudioFeatures type.
    
    All values 0.0-1.0 except tempo (BPM) and loudness (dB).
    """
    id: str
    energy: float | None = None
    tempo: float | None = None
    valence: float | None = None
    danceability: float | None = None
    acousticness: float | None = None
    instrumentalness: float | None = None
    liveness: float | None = None
    speechiness: float | None = None
    loudness: float | None = None
    key: int | None = None
    mode: int | None = None
    time_signature: int | None = None

    class Config:
        from_attributes = True


class NowPlayingData(BaseModel):
    """
    WebSocket message payload for track updates.
    
    Matches what useNowPlaying expects from the frontend.
    """
    track: Track | None
    audio_features: AudioFeatures | None
    progress_ms: int
    duration_ms: int
    is_playing: bool
    device_name: str | None = None
    context_type: str | None = None


class WebSocketMessage(BaseModel):
    """WebSocket message wrapper."""
    type: str  # "track_update", "nothing_playing", "error", "pong"
    data: dict | None = None
    error: str | None = None
