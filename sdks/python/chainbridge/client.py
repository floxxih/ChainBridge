"""High-level ChainBridge clients (sync + async)."""

from __future__ import annotations

import time
from typing import Optional, Tuple
from urllib.parse import urlparse, urlunparse

from .crypto import derive_hash_lock, generate_secret
from .http import DEFAULT_BASE_URL, AsyncHttpClient, HttpClient
from .resources import (
    AnalyticsResource,
    AssetsResource,
    AsyncHtlcsResource,
    AsyncOrdersResource,
    AsyncSwapsResource,
    AuthResource,
    HtlcsResource,
    MarketResource,
    OrdersResource,
    ProofsResource,
    SwapsResource,
)
from .types import Order, Swap
from .websocket import ChainBridgeWebSocket


def _derive_ws_url(base_url: str) -> str:
    parsed = urlparse(base_url)
    scheme = "wss" if parsed.scheme == "https" else "ws"
    path = (parsed.path or "").rstrip("/") + "/ws"
    return urlunparse((scheme, parsed.netloc, path, "", "", ""))


class ChainBridgeClient:
    """Synchronous top-level client.

    Wraps the HTTP transport plus typed resource clients and exposes
    convenience helpers (``create_swap_order``, ``wait_for_swap``).
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        ws_url: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout: float = 30.0,
        http: Optional[HttpClient] = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._ws_url = ws_url or _derive_ws_url(base_url)
        self.http = http or HttpClient(
            base_url=base_url,
            api_key=api_key,
            bearer_token=bearer_token,
            timeout=timeout,
        )
        self.orders = OrdersResource(self.http)
        self.htlcs = HtlcsResource(self.http)
        self.swaps = SwapsResource(self.http)
        self.proofs = ProofsResource(self.http)
        self.market = MarketResource(self.http)
        self.assets = AssetsResource(self.http)
        self.analytics = AnalyticsResource(self.http)
        self.auth = AuthResource(self.http)

    def create_swap_order(
        self,
        *,
        from_chain: str,
        to_chain: str,
        from_asset: str,
        to_asset: str,
        from_amount: str,
        to_amount: str,
        sender_address: str,
        expiry_seconds: int,
    ) -> Tuple[Order, str, str]:
        """Generate a fresh secret, create an order, and return ``(order, secret, hash_lock)``.

        The returned ``secret`` must be persisted privately; revealing it
        before the counterparty has locked their leg forfeits the swap.
        """

        secret = generate_secret()
        hash_lock = derive_hash_lock(secret)
        order = self.orders.create(
            from_chain=from_chain,
            to_chain=to_chain,
            from_asset=from_asset,
            to_asset=to_asset,
            from_amount=from_amount,
            to_amount=to_amount,
            sender_address=sender_address,
            expiry=expiry_seconds,
        )
        return order, secret, hash_lock

    def wait_for_swap(
        self,
        swap_id: str,
        *,
        timeout: float = 300.0,
        interval: float = 5.0,
    ) -> Swap:
        deadline = time.time() + timeout
        terminal = {"completed", "refunded", "failed"}
        while time.time() < deadline:
            swap = self.swaps.get(swap_id)
            if swap.status in terminal:
                return swap
            time.sleep(interval)
        raise TimeoutError(f"Timed out waiting for swap {swap_id}")

    def create_websocket(self) -> ChainBridgeWebSocket:
        return ChainBridgeWebSocket(self._ws_url, api_key=self._api_key)

    def close(self) -> None:
        self.http.close()

    def __enter__(self) -> "ChainBridgeClient":
        return self

    def __exit__(self, *_: object) -> None:
        self.close()


class AsyncChainBridgeClient:
    """Async top-level client. Mirrors :class:`ChainBridgeClient`."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        *,
        base_url: str = DEFAULT_BASE_URL,
        ws_url: Optional[str] = None,
        bearer_token: Optional[str] = None,
        timeout: float = 30.0,
        http: Optional[AsyncHttpClient] = None,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._ws_url = ws_url or _derive_ws_url(base_url)
        self.http = http or AsyncHttpClient(
            base_url=base_url,
            api_key=api_key,
            bearer_token=bearer_token,
            timeout=timeout,
        )
        self.orders = AsyncOrdersResource(self.http)
        self.htlcs = AsyncHtlcsResource(self.http)
        self.swaps = AsyncSwapsResource(self.http)

    def create_websocket(self) -> ChainBridgeWebSocket:
        return ChainBridgeWebSocket(self._ws_url, api_key=self._api_key)

    async def aclose(self) -> None:
        await self.http.aclose()

    async def __aenter__(self) -> "AsyncChainBridgeClient":
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()
