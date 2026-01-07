# backend/app/websocket/manager.py
"""
WebSocket connection manager.

Manages per-user WebSocket connections and their polling tasks.
"""
import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any
import uuid

from fastapi import WebSocket

logger = logging.getLogger(__name__)


@dataclass
class UserConnection:
    """Represents a user's WebSocket connection."""
    
    websocket: WebSocket
    user_id: uuid.UUID
    spotify_token: str
    connected_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    last_track_id: str | None = None
    is_playing: bool = False
    polling_task: asyncio.Task | None = None

    async def send_message(self, message: dict[str, Any]):
        """Send a JSON message to the WebSocket."""
        try:
            await self.websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send to {self.user_id}: {e}")
            raise


class ConnectionManager:
    """
    Manages WebSocket connections for all users.
    
    - One connection per user (new connection kicks old)
    - Each connection has its own polling task
    - Thread-safe with asyncio lock
    """

    def __init__(self):
        self._connections: dict[uuid.UUID, UserConnection] = {}
        self._lock = asyncio.Lock()
        self._shutdown_event: asyncio.Event | None = None

    def set_shutdown_event(self, event: asyncio.Event):
        """Set the shutdown event for graceful termination."""
        self._shutdown_event = event

    @property
    def connection_count(self) -> int:
        """Get number of active connections."""
        return len(self._connections)

    async def connect(
        self,
        websocket: WebSocket,
        user_id: uuid.UUID,
        spotify_token: str,
    ) -> UserConnection:
        """
        Register a new WebSocket connection.
        
        If user already has a connection, disconnects the old one.
        
        Args:
            websocket: FastAPI WebSocket instance
            user_id: User's UUID
            spotify_token: Decrypted Spotify access token
            
        Returns:
            UserConnection instance
        """
        async with self._lock:
            # Disconnect existing connection for same user
            if user_id in self._connections:
                logger.info(f"User {user_id} reconnecting, closing old connection")
                await self._disconnect_user(user_id)

            # Create new connection
            conn = UserConnection(
                websocket=websocket,
                user_id=user_id,
                spotify_token=spotify_token,
            )
            self._connections[user_id] = conn

            logger.info(
                f"User {user_id} connected. "
                f"Total connections: {len(self._connections)}"
            )
            return conn

    async def disconnect(self, user_id: uuid.UUID):
        """
        Disconnect a user's WebSocket.
        
        Cancels polling task and removes from connections.
        """
        async with self._lock:
            await self._disconnect_user(user_id)

    async def _disconnect_user(self, user_id: uuid.UUID):
        """Internal disconnect without lock (must be called with lock held)."""
        if user_id not in self._connections:
            return

        conn = self._connections[user_id]

        # Cancel polling task
        if conn.polling_task and not conn.polling_task.done():
            conn.polling_task.cancel()
            try:
                await conn.polling_task
            except asyncio.CancelledError:
                pass

        # Remove from connections
        del self._connections[user_id]
        logger.info(
            f"User {user_id} disconnected. "
            f"Total connections: {len(self._connections)}"
        )

    async def send_to_user(self, user_id: uuid.UUID, message: dict[str, Any]):
        """
        Send a message to a specific user.
        
        Args:
            user_id: Target user's UUID
            message: JSON-serializable message
        """
        if user_id in self._connections:
            conn = self._connections[user_id]
            try:
                await conn.send_message(message)
            except Exception:
                # Connection broken, disconnect
                await self.disconnect(user_id)

    async def broadcast(self, message: dict[str, Any]):
        """
        Send a message to all connected users.
        
        Args:
            message: JSON-serializable message
        """
        disconnected = []
        
        for user_id, conn in self._connections.items():
            try:
                await conn.send_message(message)
            except Exception:
                disconnected.append(user_id)

        # Clean up broken connections
        for user_id in disconnected:
            await self.disconnect(user_id)

    async def cleanup_stale_connections(self):
        """
        Periodic cleanup of stale connections.
        
        Called by background task in main.py.
        """
        stale = []

        async with self._lock:
            for user_id, conn in self._connections.items():
                try:
                    # Send ping to check if connection is alive
                    await asyncio.wait_for(
                        conn.websocket.send_json({"type": "ping"}),
                        timeout=5.0,
                    )
                except Exception:
                    stale.append(user_id)

        # Disconnect stale connections (outside lock to avoid deadlock)
        for user_id in stale:
            logger.info(f"Cleaning up stale connection for {user_id}")
            await self.disconnect(user_id)

    async def close_all_connections(self):
        """
        Close all connections gracefully.
        
        Called during shutdown.
        """
        logger.info(f"Closing {len(self._connections)} connections...")

        # Get all user IDs (copy to avoid modification during iteration)
        user_ids = list(self._connections.keys())

        for user_id in user_ids:
            try:
                conn = self._connections.get(user_id)
                if conn:
                    await conn.websocket.close(code=1001, reason="Server shutdown")
                await self.disconnect(user_id)
            except Exception as e:
                logger.error(f"Error closing connection for {user_id}: {e}")

        logger.info("All connections closed")


# Global manager instance
manager = ConnectionManager()
