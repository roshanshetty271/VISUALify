"""
Stats API endpoints for VISUALify.

Provides listening analytics, audio profiles, and mood journey data.
"""
from datetime import datetime, timezone, timedelta
from typing import Literal
import logging

from fastapi import APIRouter, Query, Request
from sqlalchemy import select, func, and_, desc
from sqlalchemy.orm import joinedload

from app.api.deps import CurrentUser, DbSession, HttpClient, RedisClient
from app.models import Play, Track, User
from app.core.rate_limit import limiter
from app.services.spotify_service import SpotifyService
from app.services.auth_service import AuthService
from app.core.cache import cache_get, cache_set, invalidate_user_cache

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/stats", tags=["stats"])

Period = Literal["day", "week", "month", "year", "all"]


def get_period_start(period: Period) -> datetime | None:
    """Get start datetime for a period."""
    now = datetime.now(timezone.utc)
    
    if period == "day":
        return now - timedelta(days=1)
    elif period == "week":
        return now - timedelta(days=7)
    elif period == "month":
        return now - timedelta(days=30)
    elif period == "year":
        return now - timedelta(days=365)
    else:  # all
        return None


@router.get("/summary")
@limiter.limit("30/minute")
async def get_summary(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
):
    """
    Get summary statistics for a period.
    
    Returns:
        - totalPlays: Total number of plays
        - totalMinutes: Total listening time in minutes
        - uniqueTracks: Number of unique tracks played
        - uniqueArtists: Number of unique artists
        - topGenre: Most common genre (or null)
    """
    ck = f"stats:{user.id}:summary:{period}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    # Build base query
    query = select(Play).where(Play.user_id == user.id)
    if period_start:
        query = query.where(Play.started_at >= period_start)
    
    # Get all plays
    result = await db.execute(query)
    plays = result.scalars().all()
    
    if not plays:
        return {
            "totalPlays": 0,
            "totalMinutes": 0,
            "uniqueTracks": 0,
            "uniqueArtists": 0,
            "topGenre": None,
        }
    
    # Get track IDs to fetch track details
    track_ids = list(set(play.track_id for play in plays))
    tracks_result = await db.execute(
        select(Track).where(Track.id.in_(track_ids))
    )
    tracks = {track.id: track for track in tracks_result.scalars().all()}
    
    # Calculate stats
    total_plays = len(plays)
    total_minutes = sum(
        (play.duration_played_ms or 0) / 1000 / 60 for play in plays
    )
    unique_tracks = len(track_ids)
    unique_artists = len(set(
        tracks[play.track_id].artist_id
        for play in plays
        if play.track_id in tracks and tracks[play.track_id].artist_id
    ))
    
    # Find top genre
    genre_counts = {}
    for play in plays:
        track = tracks.get(play.track_id)
        if track and track.primary_genre:
            genre_counts[track.primary_genre] = genre_counts.get(track.primary_genre, 0) + 1
    
    top_genre = max(genre_counts.items(), key=lambda x: x[1])[0] if genre_counts else None
    
    result = {
        "totalPlays": total_plays,
        "totalMinutes": round(total_minutes, 1),
        "uniqueTracks": unique_tracks,
        "uniqueArtists": unique_artists,
        "topGenre": top_genre,
    }
    await cache_set(ck, result, ttl=60)
    return result


@router.get("/listening-time")
@limiter.limit("30/minute")
async def get_listening_time(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
):
    """
    Get listening time data for chart.
    
    Returns array of:
        - date: ISO date string
        - minutes: Minutes listened that day
        - playCount: Number of plays that day
    """
    ck = f"stats:{user.id}:listening-time:{period}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    # Build query
    query = select(Play).where(Play.user_id == user.id)
    if period_start:
        query = query.where(Play.started_at >= period_start)
    
    result = await db.execute(query.order_by(Play.started_at))
    plays = result.scalars().all()
    
    # Group by date
    date_stats = {}
    for play in plays:
        date = play.started_at.date().isoformat()
        if date not in date_stats:
            date_stats[date] = {"minutes": 0, "playCount": 0}
        
        date_stats[date]["playCount"] += 1
        date_stats[date]["minutes"] += (play.duration_played_ms or 0) / 1000 / 60
    
    # Convert to list
    result_list = [
        {
            "date": date,
            "minutes": round(stats["minutes"], 1),
            "playCount": stats["playCount"],
        }
        for date, stats in sorted(date_stats.items())
    ]
    
    await cache_set(ck, result_list, ttl=60)
    return result_list


@router.get("/top-artists")
@limiter.limit("30/minute")
async def get_top_artists(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
    limit: int = Query(5, ge=1, le=20, description="Number of artists"),
):
    """
    Get top artists by play count.
    
    Returns array of:
        - artistId: Spotify artist ID
        - artistName: Artist name
        - playCount: Number of plays
        - imageUrl: Artist/album image URL (or null)
    """
    ck = f"stats:{user.id}:top-artists:{period}:{limit}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    # Get plays
    query = select(Play).where(Play.user_id == user.id)
    if period_start:
        query = query.where(Play.started_at >= period_start)
    
    result = await db.execute(query)
    plays = result.scalars().all()
    
    if not plays:
        return []
    
    # Get tracks
    track_ids = list(set(play.track_id for play in plays))
    tracks_result = await db.execute(
        select(Track).where(Track.id.in_(track_ids))
    )
    tracks = {track.id: track for track in tracks_result.scalars().all()}
    
    # Count by artist
    artist_counts = {}
    for play in plays:
        track = tracks.get(play.track_id)
        if track and track.artist_id:
            key = (track.artist_id, track.artist_name, track.album_art_url)
            artist_counts[key] = artist_counts.get(key, 0) + 1
    
    # Sort and limit
    top_artists = sorted(
        artist_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:limit]
    
    result = [
        {
            "artistId": artist_id,
            "artistName": artist_name,
            "playCount": count,
            "imageUrl": image_url,
        }
        for (artist_id, artist_name, image_url), count in top_artists
    ]
    await cache_set(ck, result, ttl=120)
    return result


@router.get("/audio-profile")
@limiter.limit("30/minute")
async def get_audio_profile(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
):
    """
    Get average audio features profile.
    
    Returns:
        - energy: Average energy (0-1)
        - valence: Average valence/happiness (0-1)
        - danceability: Average danceability (0-1)
        - acousticness: Average acousticness (0-1)
        - instrumentalness: Average instrumentalness (0-1)
    """
    ck = f"stats:{user.id}:audio-profile:{period}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    # Get plays joined with tracks to fall back to track-level features
    query = select(Play, Track).join(Track, Play.track_id == Track.id).where(
        Play.user_id == user.id,
    )
    if period_start:
        query = query.where(Play.started_at >= period_start)
    
    result = await db.execute(query)
    rows = result.all()
    
    if not rows:
        return {
            "energy": 0.5,
            "valence": 0.5,
            "danceability": 0.5,
            "acousticness": 0.5,
            "instrumentalness": 0.5,
        }
    
    energy_vals: list[float] = []
    valence_vals: list[float] = []
    danceability_vals: list[float] = []
    acousticness_vals: list[float] = []
    instrumentalness_vals: list[float] = []
    
    for play, track in rows:
        e = play.energy if play.energy is not None else track.energy
        v = play.valence if play.valence is not None else track.valence
        if e is not None:
            energy_vals.append(float(e))
        if v is not None:
            valence_vals.append(float(v))
        if track.danceability is not None:
            danceability_vals.append(float(track.danceability))
        if track.acousticness is not None:
            acousticness_vals.append(float(track.acousticness))
        if track.instrumentalness is not None:
            instrumentalness_vals.append(float(track.instrumentalness))
    
    profile = {
        "energy": round(sum(energy_vals) / len(energy_vals), 3) if energy_vals else 0.5,
        "valence": round(sum(valence_vals) / len(valence_vals), 3) if valence_vals else 0.5,
        "danceability": round(sum(danceability_vals) / len(danceability_vals), 3) if danceability_vals else 0.5,
        "acousticness": round(sum(acousticness_vals) / len(acousticness_vals), 3) if acousticness_vals else 0.5,
        "instrumentalness": round(sum(instrumentalness_vals) / len(instrumentalness_vals), 3) if instrumentalness_vals else 0.5,
    }
    await cache_set(ck, profile, ttl=120)
    return profile


@router.get("/music-phases")
@limiter.limit("30/minute")
async def get_music_phases(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
):
    """
    Get Spotify Wrapped-style music phases.
    
    Identifies distinct listening patterns/moods in your music.
    
    Returns array of:
        - name: Phase name (e.g. "Chill Evenings")
        - moodColor: Hex color based on mood
        - avgEnergy: Average energy for this phase
        - avgValence: Average valence for this phase
        - topGenre: Most common genre
        - trackCount: Number of tracks in this phase
        - topTrack: {name, artist, albumArt}
    """
    ck = f"stats:{user.id}:music-phases:{period}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    # Get plays joined with tracks so we can fall back to track-level features
    query = select(Play, Track).join(Track, Play.track_id == Track.id).where(
        Play.user_id == user.id,
    )
    if period_start:
        query = query.where(Play.started_at >= period_start)
    
    result = await db.execute(query.order_by(Play.started_at))
    rows = result.all()
    
    if not rows:
        return []
    
    # Build tracks dict and filter plays that have audio features (play-level or track-level)
    tracks: dict = {}
    plays_with_features: list[tuple] = []
    
    for play, track in rows:
        tracks[track.id] = track
        energy = play.energy if play.energy is not None else track.energy
        valence = play.valence if play.valence is not None else track.valence
        if energy is not None and valence is not None:
            plays_with_features.append((play, float(energy), float(valence)))
    
    if not plays_with_features:
        return []
    
    # Simple clustering into 3 phases based on energy/valence
    phases: dict[str, list[tuple]] = {"high_energy": [], "calm": [], "melancholy": []}
    
    for play, energy, valence in plays_with_features:
        if energy > 0.6 and valence > 0.5:
            phases["high_energy"].append((play, energy, valence))
        elif valence < 0.4:
            phases["melancholy"].append((play, energy, valence))
        else:
            phases["calm"].append((play, energy, valence))
    
    # Build phase data
    result_phases = []
    phase_names = {
        "high_energy": "High Energy",
        "calm": "Chill Vibes",
        "melancholy": "Introspective",
    }
    
    for phase_key, phase_plays in phases.items():
        if not phase_plays:
            continue
        
        avg_energy = sum(e for _, e, _ in phase_plays) / len(phase_plays)
        avg_valence = sum(v for _, _, v in phase_plays) / len(phase_plays)
        
        # Get top genre
        genre_counts: dict[str, int] = {}
        for play, _, _ in phase_plays:
            track = tracks.get(play.track_id)
            if track and track.primary_genre:
                genre_counts[track.primary_genre] = genre_counts.get(track.primary_genre, 0) + 1
        top_genre = max(genre_counts.items(), key=lambda x: x[1])[0] if genre_counts else "Unknown"
        
        # Get top track (most played)
        track_counts: dict = {}
        for play, _, _ in phase_plays:
            track_counts[play.track_id] = track_counts.get(play.track_id, 0) + 1
        top_track_id = max(track_counts.items(), key=lambda x: x[1])[0]
        top_track = tracks[top_track_id]
        
        # Determine mood color
        if avg_valence > 0.6 and avg_energy > 0.6:
            mood_color = "#FBBF24"  # happy
        elif avg_valence > 0.6:
            mood_color = "#10B981"  # calm
        elif avg_energy > 0.6:
            mood_color = "#EC4899"  # energetic
        elif avg_valence < 0.4 and avg_energy < 0.4:
            mood_color = "#3B82F6"  # melancholy
        else:
            mood_color = "#8B5CF6"  # neutral
        
        result_phases.append({
            "name": phase_names[phase_key],
            "moodColor": mood_color,
            "avgEnergy": round(avg_energy, 3),
            "avgValence": round(avg_valence, 3),
            "topGenre": top_genre,
            "trackCount": len(set(p.track_id for p, _, _ in phase_plays)),
            "topTrack": {
                "name": top_track.name,
                "artist": top_track.artist_name,
                "albumArt": top_track.album_art_url or "",
            },
        })
    
    await cache_set(ck, result_phases, ttl=300)
    return result_phases


@router.get("/mood-journey")
@limiter.limit("30/minute")
async def get_mood_journey(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    period: Period = Query("week", description="Time period"),
):
    """
    Get mood journey timeline data.
    
    Joins with Track to get audio features, falling back to defaults
    when features are missing on both Play and Track.
    """
    ck = f"stats:{user.id}:mood-journey:{period}"
    cached = await cache_get(ck)
    if cached is not None:
        return cached

    period_start = get_period_start(period)
    
    query = (
        select(Play)
        .where(Play.user_id == user.id)
        .options(joinedload(Play.track))
    )
    if period_start:
        query = query.where(Play.started_at >= period_start)
    query = query.order_by(Play.started_at).limit(200)
    
    result = await db.execute(query)
    plays = result.unique().scalars().all()
    
    if not plays:
        return []
    
    timeline = []
    for play in plays:
        track = play.track
        if not track:
            continue
        
        energy_val = play.energy if play.energy is not None else track.energy
        valence_val = play.valence if play.valence is not None else track.valence
        
        timeline.append({
            "playId": str(play.id),
            "trackName": track.name,
            "artistName": track.artist_name,
            "albumArt": track.album_art_url or "",
            "playedAt": play.started_at.isoformat(),
            "energy": float(energy_val) if energy_val is not None else 0.5,
            "valence": float(valence_val) if valence_val is not None else 0.5,
        })
    
    await cache_set(ck, timeline, ttl=30)
    return timeline


@router.post("/sync-history")
@limiter.limit("5/minute")
async def sync_recent_history(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    http_client: HttpClient,
    redis: RedisClient,
):
    """
    Import recent listening history from Spotify.
    
    Fetches last 50 tracks, batch-fetches audio features, and saves
    everything to the database in one go.
    """
    logger.info(f"Syncing history for user {user.id}")
    
    if user.is_token_expired():
        logger.info(f"Token expired for user {user.id}, refreshing...")
        auth_service = AuthService(db, redis, http_client)
        try:
            access_token = await auth_service.refresh_spotify_token(user)
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return {
                "error": "Token refresh failed. Please log in again.",
                "imported": 0,
                "total_fetched": 0,
            }
    else:
        access_token = user.access_token
    
    spotify = SpotifyService(http_client)
    
    try:
        data = await spotify.get_recently_played(access_token, limit=50)
    except Exception as e:
        logger.error(f"Failed to fetch history: {e}")
        return {
            "error": f"Failed to fetch history: {str(e)}",
            "imported": 0,
            "total_fetched": 0,
        }
    
    items = data.get("items", [])
    imported_count = 0
    tracks_needing_features: dict[str, Track] = {}
    new_plays: list[tuple[Play, Track]] = []
    
    for item in items:
        try:
            played_at_str = item["played_at"]
            played_at = datetime.fromisoformat(played_at_str.replace("Z", "+00:00"))
            
            track_data = item["track"]
            spotify_track_id = track_data["id"]
            
            if track_data.get("is_local", False):
                continue
            
            result = await db.execute(
                select(Track).where(Track.spotify_id == spotify_track_id)
            )
            track = result.scalar_one_or_none()
            
            if not track:
                artists = track_data.get("artists", [])
                artist = artists[0] if artists else {"id": "", "name": "Unknown"}
                album = track_data.get("album", {})
                images = album.get("images", [])
                
                track = Track(
                    spotify_id=spotify_track_id,
                    name=track_data["name"],
                    artist_name=artist["name"],
                    artist_id=artist.get("id"),
                    album_name=album.get("name"),
                    album_id=album.get("id"),
                    album_art_url=images[0]["url"] if images else None,
                    duration_ms=track_data.get("duration_ms", 0),
                    popularity=track_data.get("popularity", 0),
                    is_local=False,
                )
                db.add(track)
                await db.flush()
            
            if not track.features_cached or track.energy is None:
                tracks_needing_features[spotify_track_id] = track
            
            existing_play = await db.execute(
                select(Play).where(
                    and_(
                        Play.user_id == user.id,
                        Play.track_id == track.id,
                        Play.started_at == played_at,
                    )
                )
            )
            
            if not existing_play.scalar_one_or_none():
                play = Play(
                    user_id=user.id,
                    track_id=track.id,
                    started_at=played_at,
                    duration_played_ms=track_data.get("duration_ms", 0),
                    completed=True,
                    skipped=False,
                    energy=track.energy,
                    valence=track.valence,
                    tempo=track.tempo,
                    context_type=item.get("context", {}).get("type") if item.get("context") else None,
                    context_uri=item.get("context", {}).get("uri") if item.get("context") else None,
                )
                db.add(play)
                new_plays.append((play, track))
                imported_count += 1
                
        except Exception as e:
            logger.error(f"Error importing play: {e}")
            continue
    
    # Batch-fetch audio features (single API call instead of N individual ones)
    features_updated = 0
    if tracks_needing_features:
        try:
            features_map = await spotify.get_audio_features_batch(
                list(tracks_needing_features.keys()),
                access_token,
            )
            for spotify_id, features in features_map.items():
                track = tracks_needing_features[spotify_id]
                track.energy = features.get("energy")
                track.tempo = features.get("tempo")
                track.valence = features.get("valence")
                track.danceability = features.get("danceability")
                track.acousticness = features.get("acousticness")
                track.instrumentalness = features.get("instrumentalness")
                track.liveness = features.get("liveness")
                track.speechiness = features.get("speechiness")
                track.loudness = features.get("loudness")
                track.key = features.get("key")
                track.mode = features.get("mode")
                track.time_signature = features.get("time_signature")
                track.features_cached = True
                features_updated += 1
        except Exception as e:
            logger.warning(f"Batch features fetch failed: {e}")
    
    # Propagate features to newly created plays
    for play, track in new_plays:
        if play.energy is None and track.energy is not None:
            play.energy = track.energy
            play.valence = track.valence
            play.tempo = track.tempo
    
    # Update existing plays missing features
    updated_plays = 0
    existing_plays_result = await db.execute(
        select(Play).where(
            and_(
                Play.user_id == user.id,
                Play.energy == None,  # noqa: E711
            )
        ).options(joinedload(Play.track))
    )
    existing_plays = existing_plays_result.unique().scalars().all()
    
    for play in existing_plays:
        if play.track and play.track.energy is not None:
            play.energy = play.track.energy
            play.valence = play.track.valence
            play.tempo = play.track.tempo
            updated_plays += 1
    
    await db.commit()
    await invalidate_user_cache(user.id)
    
    logger.info(
        f"Imported {imported_count}/{len(items)} plays, "
        f"{features_updated} features fetched, "
        f"{updated_plays} existing plays updated for user {user.id}"
    )
    
    return {
        "imported": imported_count,
        "features_updated": features_updated,
        "updated": updated_plays,
        "total_fetched": len(items),
        "message": f"Imported {imported_count} plays, updated {features_updated} tracks with features, {updated_plays} existing plays updated",
    }


@router.post("/backfill-features")
@limiter.limit("3/minute")
async def backfill_audio_features(
    request: Request,
    user: CurrentUser,
    db: DbSession,
    http_client: HttpClient,
    redis: RedisClient,
):
    """
    Backfill audio features for all tracks and plays missing them.
    
    Uses batch API to fetch features efficiently instead of one-by-one.
    """
    logger.info(f"Backfilling audio features for user {user.id}")
    
    if user.is_token_expired():
        auth_service = AuthService(db, redis, http_client)
        try:
            access_token = await auth_service.refresh_spotify_token(user)
        except Exception as e:
            logger.error(f"Token refresh failed: {e}")
            return {"error": "Token refresh failed. Please log in again."}
    else:
        access_token = user.access_token
    
    spotify = SpotifyService(http_client)
    
    # Find all tracks missing audio features
    tracks_result = await db.execute(
        select(Track).where(Track.energy == None)  # noqa: E711
    )
    tracks_to_update = tracks_result.scalars().all()
    
    tracks_updated = 0
    if tracks_to_update:
        track_ids = [t.spotify_id for t in tracks_to_update]
        tracks_map = {t.spotify_id: t for t in tracks_to_update}
        
        try:
            features_map = await spotify.get_audio_features_batch(track_ids, access_token)
            for spotify_id, features in features_map.items():
                if spotify_id in tracks_map:
                    track = tracks_map[spotify_id]
                    track.energy = features.get("energy")
                    track.tempo = features.get("tempo")
                    track.valence = features.get("valence")
                    track.danceability = features.get("danceability")
                    track.acousticness = features.get("acousticness")
                    track.instrumentalness = features.get("instrumentalness")
                    track.liveness = features.get("liveness")
                    track.speechiness = features.get("speechiness")
                    track.loudness = features.get("loudness")
                    track.key = features.get("key")
                    track.mode = features.get("mode")
                    track.time_signature = features.get("time_signature")
                    track.features_cached = True
                    tracks_updated += 1
        except Exception as e:
            logger.warning(f"Batch features fetch failed: {e}")
    
    await db.flush()
    
    # Update all plays for this user that are missing audio features
    plays_result = await db.execute(
        select(Play).where(
            and_(
                Play.user_id == user.id,
                Play.energy == None,  # noqa: E711
            )
        ).options(joinedload(Play.track))
    )
    plays_to_update = plays_result.unique().scalars().all()
    
    plays_updated = 0
    for play in plays_to_update:
        if play.track and play.track.energy is not None:
            play.energy = play.track.energy
            play.valence = play.track.valence
            play.tempo = play.track.tempo
            plays_updated += 1
    
    await db.commit()
    await invalidate_user_cache(user.id)
    
    logger.info(f"Backfill complete: {tracks_updated} tracks, {plays_updated} plays updated")
    
    return {
        "tracks_updated": tracks_updated,
        "plays_updated": plays_updated,
        "message": f"Updated {tracks_updated} tracks and {plays_updated} plays with audio features",
    }

