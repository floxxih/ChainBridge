"""
WebSocket event schema and emit helpers for real-time notifications (#59).

All events follow this envelope:
{
    "event_type": "<domain>.<action>",
    "timestamp":  "<ISO-8601 UTC>",
    "channel":    "<channel-name>",
    "data":       { ... }
}

Channels
--------
swaps           – all swap state changes (broadcast)
swap:<id>       – single swap (targeted)
htlcs           – all HTLC events (broadcast)
htlc:<id>       – single HTLC (targeted)
orders          – all order-book events (broadcast)
order:<id>      – single order (targeted)
"""

import json
from datetime import datetime, timezone
from enum import Enum
from typing import Any

from redis.asyncio import Redis


class EventType(str, Enum):
    # Swap lifecycle
    SWAP_CREATED = "swap.created"
    SWAP_STATUS_CHANGED = "swap.status_changed"
    SWAP_PROOF_VERIFIED = "swap.proof_verified"
    SWAP_COMPLETED = "swap.completed"
    SWAP_FAILED = "swap.failed"

    # HTLC lifecycle
    HTLC_CREATED = "htlc.created"
    HTLC_CLAIMED = "htlc.claimed"
    HTLC_REFUNDED = "htlc.refunded"
    HTLC_EXPIRED = "htlc.expired"

    # Order lifecycle
    ORDER_CREATED = "order.created"
    ORDER_MATCHED = "order.matched"
    ORDER_CANCELLED = "order.cancelled"
    ORDER_FILLED = "order.filled"


def _build_event(event_type: EventType, channel: str, data: Any) -> str:
    return json.dumps(
        {
            "event_type": event_type.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "channel": channel,
            "data": data,
        },
        default=str,
    )


async def emit_swap_event(redis: Redis, event_type: EventType, swap_data: dict) -> None:
    """Publish a swap event to the per-swap channel and the global swaps channel."""
    swap_id = str(swap_data.get("id", ""))
    payload = _build_event(event_type, f"swap:{swap_id}", swap_data)
    await redis.publish(f"cb:swap:{swap_id}", payload)
    await redis.publish("cb:swaps", payload)


async def emit_htlc_event(redis: Redis, event_type: EventType, htlc_data: dict) -> None:
    """Publish an HTLC event to the per-HTLC channel and the global htlcs channel."""
    htlc_id = str(htlc_data.get("id", ""))
    payload = _build_event(event_type, f"htlc:{htlc_id}", htlc_data)
    await redis.publish(f"cb:htlc:{htlc_id}", payload)
    await redis.publish("cb:htlcs", payload)


async def emit_order_event(
    redis: Redis, event_type: EventType, order_data: dict
) -> None:
    """Publish an order event to the per-order channel and the global orders channel."""
    order_id = str(order_data.get("id", ""))
    payload = _build_event(event_type, f"order:{order_id}", order_data)
    await redis.publish(f"cb:order:{order_id}", payload)
    await redis.publish("cb:orders", payload)
