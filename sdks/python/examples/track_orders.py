"""Subscribe to ChainBridge order events from Python."""

from __future__ import annotations

import asyncio
import os

from chainbridge import AsyncChainBridgeClient
from chainbridge.types import WsEvent


async def on_event(event: WsEvent) -> None:
    print(f"{event.type}: {event.data}")


async def main() -> None:
    async with AsyncChainBridgeClient(api_key=os.environ.get("CHAINBRIDGE_API_KEY")) as client:
        ws = client.create_websocket()
        ws.subscribe("orders", on_event)
        await ws.start()
        try:
            await asyncio.Event().wait()
        finally:
            await ws.close()


if __name__ == "__main__":
    asyncio.run(main())
