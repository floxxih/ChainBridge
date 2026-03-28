import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from app.middleware.auth import decode_jwt_token
from app.ws.manager import ConnectionManager
from app.config.redis import get_redis

logger = logging.getLogger(__name__)

router = APIRouter()

# Valid subscribable channels (prevents clients from subscribing to arbitrary keys)
_CHANNEL_PREFIXES = ("swaps", "swap:", "htlcs", "htlc:", "orders", "order:")


def _is_valid_channel(channel: str) -> bool:
    return any(channel == p or channel.startswith(p) for p in _CHANNEL_PREFIXES)


async def get_manager(websocket: WebSocket) -> ConnectionManager:
    """Dependency to get the WebSocket manager from the app state."""
    return websocket.app.state.ws_manager


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: Optional[str] = Query(None),
    manager: ConnectionManager = Depends(get_manager),
):
    """
    Main WebSocket endpoint for real-time updates (#30, #59).
    Authenticate with JWT via query param 'token'.

    Client → server message types
    --------------------------------
    subscribe          Subscribe to a channel (optionally filter by event_types)
    unsubscribe        Unsubscribe from a channel
    update_preferences Update event_type filter for an existing subscription
    ping               Keepalive ping
    """
    if not token or not decode_jwt_token(token):
        await websocket.close(code=1008)  # Policy Violation
        return

    await manager.connect(websocket)

    # Send a welcome message listing available channels
    await websocket.send_text(
        json.dumps(
            {
                "type": "connected",
                "channels": list(_CHANNEL_PREFIXES),
            }
        )
    )

    try:
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                logger.error("Invalid JSON from WebSocket client: %s", data)
                continue

            msg_type = message.get("type")

            if msg_type == "subscribe":
                channel = message.get("channel", "")
                event_types = message.get("event_types")  # optional list[str]
                if not _is_valid_channel(channel):
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "message": f"Unknown channel: {channel}",
                            }
                        )
                    )
                    continue
                await manager.subscribe(websocket, channel, event_types)
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "subscribed",
                            "channel": channel,
                            "event_types": event_types or [],
                        }
                    )
                )

            elif msg_type == "unsubscribe":
                channel = message.get("channel", "")
                await manager.unsubscribe(websocket, channel)
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "unsubscribed",
                            "channel": channel,
                        }
                    )
                )

            elif msg_type == "update_preferences":
                # Update the event_type filter for an already-subscribed channel
                channel = message.get("channel", "")
                event_types = message.get("event_types")
                if not _is_valid_channel(channel):
                    await websocket.send_text(
                        json.dumps(
                            {
                                "type": "error",
                                "message": f"Unknown channel: {channel}",
                            }
                        )
                    )
                    continue
                await manager.subscribe(websocket, channel, event_types)
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "preferences_updated",
                            "channel": channel,
                            "event_types": event_types or [],
                        }
                    )
                )

            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

            else:
                logger.warning("Unknown WebSocket message type: %s", msg_type)

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error("WebSocket error: %s", e)
        manager.disconnect(websocket)
