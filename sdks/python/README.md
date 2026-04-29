# chainbridge — ChainBridge Python SDK

Official Python client for [ChainBridge](https://github.com/floxxih/ChainBridge) cross-chain atomic swaps.

## Install

```bash
pip install chainbridge
```

Requires Python 3.9+. Uses `httpx` for HTTP and `websockets` for streaming.

## Quick start

```python
from chainbridge import ChainBridgeClient

with ChainBridgeClient(api_key="cb_xxx") as client:
    fees = client.market.estimate_fees(
        from_chain="stellar", to_chain="bitcoin", from_amount="1000000000"
    )

    order, secret, hash_lock = client.create_swap_order(
        from_chain="stellar",
        to_chain="bitcoin",
        from_asset="XLM",
        to_asset="BTC",
        from_amount="1000000000",
        to_amount="10000",
        sender_address="GA...",
        expiry_seconds=86_400,
    )
    # Persist `secret` privately — revealing it claims the counterparty leg.
```

## Async client

```python
import asyncio
from chainbridge import AsyncChainBridgeClient


async def main():
    async with AsyncChainBridgeClient(api_key="cb_xxx") as client:
        order = await client.orders.get("order-id")
        print(order)


asyncio.run(main())
```

## Resources

| Attribute | Endpoint family |
|-----------|-----------------|
| `client.orders` | `/api/v1/orders` |
| `client.htlcs` | `/api/v1/htlcs` |
| `client.swaps` | `/api/v1/swaps` |
| `client.proofs` | `/api/v1/proofs` |
| `client.market` | `/api/v1/market` |
| `client.assets` | `/api/v1/assets` |
| `client.analytics` | `/api/v1/analytics` |
| `client.auth` | `/api/v1/auth` |

## Errors

```python
from chainbridge import (
    ChainBridgeError, AuthenticationError, NotFoundError,
    RateLimitError, ValidationError,
)

try:
    client.orders.get("missing")
except NotFoundError as e:
    print(e.code, e.message)
except RateLimitError as e:
    print("retry after:", e.retry_after_seconds)
```

The HTTP transport retries `5xx`, `429`, and network errors with exponential backoff.

## WebSocket events

```python
import asyncio
from chainbridge import AsyncChainBridgeClient
from chainbridge.types import WsEvent


async def on_event(event: WsEvent):
    print(event.type, event.data)


async def main():
    async with AsyncChainBridgeClient(api_key="cb_xxx") as client:
        ws = client.create_websocket()
        ws.subscribe("swaps", on_event, filters={"address": "GA..."})
        await ws.start()
        await asyncio.Event().wait()
```

## Wallet helpers

`chainbridge.wallets` exposes a chain-agnostic `HtlcWalletAdapter` protocol plus
a `StubWallet` for tests. See [examples/](./examples) for usage patterns.

## Development

```bash
pip install -e ".[dev]"
pytest
ruff check .
mypy chainbridge
```

## License

MIT
