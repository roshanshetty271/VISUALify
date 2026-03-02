# backend/app/websocket/handlers.py
"""
WebSocket endpoint handlers.

Authentication happens via query parameter BEFORE accepting the connection.
This prevents unauthenticated users from consuming server resources.
"""
import asyncio
import logging
import uuid

from fastapi import WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.database import get_session_factory
from app.models import User
from app.websocket.manager import manager
from app.services.polling_service import PollingService

logger = logging.getLogger(__name__)


async def websocket_now_playing(
    websocket: WebSocket,
    token: str = Query(..., description="JWT token for authentication"),
):
    """
    WebSocket endpoint for real-time now playing updates.
    
    Connection URL: ws://localhost:8000/ws/now-playing?token=<jwt>
    
    Authentication flow:
    1. Token is validated BEFORE accepting connection
    2. User is fetched from database
    3. Spotify token is decrypted
    4. Only then is WebSocket accepted
    5. Polling task is started for this user
    
    Messages sent to client:
    - {"type": "connected", "user_id": "..."}
    - {"type": "track_update", "data": {...}}
    - {"type": "progress_update", "data": {"progress_ms": ..., "is_playing": ...}}
    - {"type": "nothing_playing"}
    - {"type": "error", "error": "...", "message": "..."}
    - {"type": "rate_limited", "data": {"retry_after": ...}}
    - {"type": "pong"} (response to ping)
    
    Messages from client:
    - {"type": "ping"} - keep-alive ping
    """
    # ========================================
    # VALIDATE TOKEN BEFORE ACCEPTING
    # ========================================
    user_id_str = decode_access_token(token)

    if not user_id_str:
        logger.warning("WebSocket auth failed: invalid token")
        await websocket.close(code=4001, reason="Invalid or expired token")
        return

    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        logger.warning(f"WebSocket auth failed: invalid user ID format: {user_id_str}")
        await websocket.close(code=4001, reason="Invalid user ID")
        return

    # Get user from database
    factory = get_session_factory()
    async with factory() as db:
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()

        if not user:
            logger.warning(f"WebSocket auth failed: user not found: {user_id}")
            await websocket.close(code=4001, reason="User not found")
            return

        if not user.is_active:
            await websocket.close(code=4003, reason="Account deactivated")
            return

        if not user.access_token:
            await websocket.close(code=4002, reason="No Spotify token linked")
            return

        # Get decrypted Spotify token
        spotify_token = user.access_token
        user.update_last_seen()
        await db.commit()

    # ========================================
    # ACCEPT CONNECTION (Auth passed)
    # ========================================
    await websocket.accept()
    logger.info(f"WebSocket accepted for user {user_id}")

    conn = None
    try:
        # Register with connection manager
        conn = await manager.connect(
            websocket=websocket,
            user_id=user_id,
            spotify_token=spotify_token,
        )

        # Send confirmation - may fail if client disconnects immediately
        try:
            await conn.send_message({
                "type": "connected",
                "user_id": str(user_id),
            })
        except Exception as e:
            logger.warning(f"Failed to send connected message to {user_id}: {e}")
            return

        # Start polling task
        polling = PollingService(conn, websocket.app.state)
        conn.polling_task = asyncio.create_task(polling.run())

        # Keep-alive loop - handle client messages
        while True:
            try:
                message = await websocket.receive_json()
                
                if message.get("type") == "ping":
                    try:
                        await conn.send_message({"type": "pong"})
                    except Exception:
                        # Connection closed, exit loop
                        break
                        
            except asyncio.TimeoutError:
                # No message received, continue
                pass

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user_id}")

    except Exception as e:
        # Only log if it's not a common disconnect error
        if "ConnectionClosedError" not in str(type(e).__name__):
            logger.error(f"WebSocket error for user {user_id}: {e}")

    finally:
        # Clean up - only if we successfully connected
        if conn is not None:
            await manager.disconnect(user_id)
