import asyncio
import json
import logging
from typing import Any, Dict, List, Optional, Set

from fastapi import WebSocket
from redis.asyncio import Redis

logger = logging.getLogger(__name__)

_HEARTBEAT_INTERVAL = 30  # seconds


class ConnectionManager:
    """Manage WebSocket connections and Redis pub/sub subscriptions (#30, #59)."""

    def __init__(self, redis: Redis):
        self.active_connections: Set[WebSocket] = set()
        # channel -> set of subscribed WebSocket connections
        self.subscriptions: Dict[str, Set[WebSocket]] = {}
        # Per-connection notification preferences: websocket -> channel -> allowed event_types
        # An empty set means "all event types are allowed" for that channel.
        self.preferences: Dict[WebSocket, Dict[str, Set[str]]] = {}
        self.redis = redis
        self.pubsub_task: Optional[asyncio.Task] = None
        self._heartbeat_task: Optional[asyncio.Task] = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        self.preferences[websocket] = {}
        logger.info("New WebSocket connection. Total: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        self.preferences.pop(websocket, None)
        for channel in list(self.subscriptions.keys()):
            self.subscriptions[channel].discard(websocket)
            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
        logger.info("WebSocket disconnected. Total: %d", len(self.active_connections))

    async def subscribe(
        self,
        websocket: WebSocket,
        channel: str,
        event_types: Optional[List[str]] = None,
    ):
        """Subscribe a connection to a channel, optionally filtered by event_types."""
        if channel not in self.subscriptions:
            self.subscriptions[channel] = set()
        self.subscriptions[channel].add(websocket)
        if websocket not in self.preferences:
            self.preferences[websocket] = {}
        # Store filter; empty set means "accept all"
        self.preferences[websocket][channel] = (
            set(event_types) if event_types else set()
        )
        logger.debug("Client subscribed to %s (filter=%s)", channel, event_types)

    async def unsubscribe(self, websocket: WebSocket, channel: str):
        if channel in self.subscriptions:
            self.subscriptions[channel].discard(websocket)
            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
        if websocket in self.preferences:
            self.preferences[websocket].pop(channel, None)
        logger.debug("Client unsubscribed from %s", channel)

    def get_subscribed_channels(self, websocket: WebSocket) -> List[str]:
        """Return all channels the given connection is subscribed to."""
        return [ch for ch, conns in self.subscriptions.items() if websocket in conns]

    async def broadcast(self, channel: str, message: Any):
        """Broadcast a message to all subscribers of a channel, applying per-connection filters."""
        if channel not in self.subscriptions:
            return

        event_type: Optional[str] = None
        if isinstance(message, dict):
            event_type = message.get("event_type")

        payload = json.dumps({"channel": channel, "data": message})
        disconnected: Set[WebSocket] = set()

        for connection in list(self.subscriptions.get(channel, set())):
            # Apply notification preference filter
            if event_type:
                allowed = self.preferences.get(connection, {}).get(channel, set())
                if allowed and event_type not in allowed:
                    continue

            try:
                await connection.send_text(payload)
            except Exception:
                disconnected.add(connection)

        for connection in disconnected:
            self.disconnect(connection)

    async def send_personal(self, websocket: WebSocket, message: Any):
        """Send a message directly to a single connection."""
        try:
            await websocket.send_text(json.dumps(message))
        except Exception as e:
            logger.error("Failed to send personal message: %s", e)
            self.disconnect(websocket)

    async def _heartbeat(self):
        """Periodically ping all connections to detect stale clients."""
        while True:
            await asyncio.sleep(_HEARTBEAT_INTERVAL)
            disconnected: Set[WebSocket] = set()
            for connection in list(self.active_connections):
                try:
                    await connection.send_text(json.dumps({"type": "ping"}))
                except Exception:
                    disconnected.add(connection)
            for connection in disconnected:
                self.disconnect(connection)

    async def start_redis_listener(self):
        """Listen for Redis pub/sub messages and forward to local WebSocket subscribers."""
        pubsub = self.redis.pubsub()
        await pubsub.psubscribe("cb:*")
        logger.info("Started Redis pub/sub listener for WebSockets")

        try:
            async for message in pubsub.listen():
                if message["type"] != "pmessage":
                    continue

                channel = message["channel"]
                if isinstance(channel, bytes):
                    channel = channel.decode()

                raw = message["data"]
                if isinstance(raw, bytes):
                    raw = raw.decode()

                try:
                    data = json.loads(raw)
                except (json.JSONDecodeError, TypeError):
                    continue

                # Strip the "cb:" prefix to get the internal channel name
                internal_channel = channel.removeprefix("cb:")
                await self.broadcast(internal_channel, data)

        except Exception as e:
            logger.error("Redis pub/sub listener error: %s", e)
        finally:
            await pubsub.punsubscribe("cb:*")
            await pubsub.close()

    def start(self):
        if not self.pubsub_task:
            self.pubsub_task = asyncio.create_task(self.start_redis_listener())
        if not self._heartbeat_task:
            self._heartbeat_task = asyncio.create_task(self._heartbeat())

    async def stop(self):
        for task in (self.pubsub_task, self._heartbeat_task):
            if task:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
        self.pubsub_task = None
        self._heartbeat_task = None
