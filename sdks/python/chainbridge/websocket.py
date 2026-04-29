"""WebSocket subscriber for real-time events."""

from __future__ import annotations

import asyncio
import json
import logging
from typing import Any, AsyncIterator, Awaitable, Callable, Dict, List, Optional

import websockets

from .types import WsEvent

log = logging.getLogger(__name__)

WsHandler = Callable[[WsEvent], Awaitable[None]]


class ChainBridgeWebSocket:
    """Async WebSocket client that auto-reconnects with exponential backoff."""

    def __init__(
        self,
        url: str,
        *,
        api_key: Optional[str] = None,
        bearer_token: Optional[str] = None,
        max_reconnect_attempts: int = 10,
        reconnect_delay: float = 1.0,
    ) -> None:
        self._url = url
        self._headers: Dict[str, str] = {}
        if api_key:
            self._headers["X-API-Key"] = api_key
        if bearer_token:
            self._headers["Authorization"] = f"Bearer {bearer_token}"
        self._max_reconnect = max_reconnect_attempts
        self._reconnect_delay = reconnect_delay
        self._subs: List[Dict[str, Any]] = []
        self._handlers: List[WsHandler] = []
        self._task: Optional[asyncio.Task[None]] = None
        self._stop = asyncio.Event()
        self._connected = asyncio.Event()
        self._ws: Optional[websockets.WebSocketClientProtocol] = None

    def subscribe(
        self, channel: str, handler: WsHandler, *, filters: Optional[Dict[str, Any]] = None
    ) -> None:
        sub = {"action": "subscribe", "channel": channel}
        if filters:
            sub["filters"] = filters
        self._subs.append(sub)
        self._handlers.append(handler)

    async def start(self) -> None:
        """Connect and run the receive loop until :meth:`close` is called."""

        self._task = asyncio.create_task(self._run())
        await self._connected.wait()

    async def close(self) -> None:
        self._stop.set()
        if self._ws is not None:
            await self._ws.close()
        if self._task is not None:
            try:
                await self._task
            except asyncio.CancelledError:
                pass

    async def stream(self) -> AsyncIterator[WsEvent]:
        """Async iterator yielding events as they arrive (alternative to handlers)."""

        queue: asyncio.Queue[WsEvent] = asyncio.Queue()

        async def _enqueue(event: WsEvent) -> None:
            await queue.put(event)

        self._handlers.append(_enqueue)
        if self._task is None:
            await self.start()
        try:
            while not self._stop.is_set():
                yield await queue.get()
        finally:
            await self.close()

    async def _run(self) -> None:
        attempts = 0
        while not self._stop.is_set():
            try:
                async with websockets.connect(
                    self._url, extra_headers=self._headers
                ) as ws:
                    self._ws = ws
                    attempts = 0
                    for sub in self._subs:
                        await ws.send(json.dumps(sub))
                    self._connected.set()
                    async for raw in ws:
                        await self._dispatch(raw)
            except Exception as exc:  # noqa: BLE001 — reconnect on anything
                log.warning("ChainBridge WS connection lost: %s", exc)
                self._connected.clear()
                if self._stop.is_set() or attempts >= self._max_reconnect:
                    break
                attempts += 1
                await asyncio.sleep(self._reconnect_delay * (2 ** (attempts - 1)))

    async def _dispatch(self, raw: Any) -> None:
        try:
            payload = json.loads(raw if isinstance(raw, str) else raw.decode())
        except (ValueError, AttributeError):
            return
        event = WsEvent(type=payload.get("type", ""), data=payload.get("data", {}))
        for handler in list(self._handlers):
            try:
                await handler(event)
            except Exception:  # noqa: BLE001
                log.exception("WS handler raised; continuing")
