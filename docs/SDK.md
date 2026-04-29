# ChainBridge Developer SDKs

ChainBridge ships three official client libraries that wrap the [REST API](./API.md)
and the public WebSocket feed. All three SDKs expose the same architectural
shape: typed resource clients, a high-level swap helper, HTLC crypto utilities,
WebSocket subscribers, and a wallet-adapter interface.

| Language | Package | Source | Min runtime |
|----------|---------|--------|-------------|
| TypeScript / JavaScript | [`@chainbridge/sdk`](../sdks/typescript) | `sdks/typescript` | Node 18+, modern browsers |
| Python | [`chainbridge`](../sdks/python) | `sdks/python` | Python 3.9+ |
| Rust | [`chainbridge-sdk`](../sdks/rust) | `sdks/rust` | Rust 1.75+ |

## Architecture

```
                         ChainBridgeClient
                                 │
   ┌──────────────┬──────────────┼──────────────┬──────────────┐
   │              │              │              │              │
 orders         htlcs          swaps          market         analytics
 proofs        assets          auth          (typed resource clients)
                                 │
                          HttpClient (envelope unwrap, retry, errors)
                                 │
                       Crypto helpers · WebSocket subscriber
                                 │
                         Wallet adapter interface
```

- **Resource clients** (`client.orders`, `client.htlcs`, …) are thin typed
  wrappers around the REST endpoints documented in [API.md](./API.md).
- **Crypto helpers** generate cryptographically-secure secrets, derive SHA-256
  hash-locks, verify preimages, and recommend timelock splits.
- **WebSocket subscriber** auto-reconnects with exponential backoff and
  re-sends pending subscriptions after reconnection.
- **Wallet adapter interface** decouples the SDK from any specific on-chain
  toolkit so applications can plug in Freighter, MetaMask, Phantom, hardware
  wallets, or backend signers.

## Installation

| Language | Command |
|----------|---------|
| TypeScript | `npm install @chainbridge/sdk` |
| Python | `pip install chainbridge` |
| Rust | `cargo add chainbridge-sdk` |

## Quick start

### TypeScript

```ts
import { ChainBridgeClient } from "@chainbridge/sdk";

const client = new ChainBridgeClient({ apiKey: process.env.CHAINBRIDGE_API_KEY });
const { order, secret, hashLock } = await client.createSwapOrder({
  from_chain: "stellar",
  to_chain: "bitcoin",
  from_asset: "XLM",
  to_asset: "BTC",
  from_amount: "1000000000",
  to_amount: "10000",
  sender_address: "GA...",
  expirySeconds: 86_400,
});
```

### Python

```python
from chainbridge import ChainBridgeClient

with ChainBridgeClient(api_key="cb_xxx") as client:
    order, secret, hash_lock = client.create_swap_order(
        from_chain="stellar", to_chain="bitcoin",
        from_asset="XLM", to_asset="BTC",
        from_amount="1000000000", to_amount="10000",
        sender_address="GA...", expiry_seconds=86_400,
    )
```

### Rust

```rust
use chainbridge_sdk::{ChainBridgeClient, ClientConfig, CreateOrderInput};

let client = ChainBridgeClient::new(ClientConfig {
    base_url: "https://api.chainbridge.io".into(),
    api_key: Some(std::env::var("CHAINBRIDGE_API_KEY")?),
    ..Default::default()
})?;
let order = client.orders().create(&CreateOrderInput { /* ... */ }).await?;
```

## Authentication

Every SDK accepts an `apiKey`/`api_key` in its constructor. Backends should
prefer API keys; user-facing apps can exchange a key for a short-lived JWT
via `auth.exchangeForToken()` and call `setBearerToken()` on the HTTP client.

```ts
const { access_token } = await client.auth.exchangeForToken();
client.http.setBearerToken(access_token);
```

## Error handling

All SDKs raise/return a structured error type with a stable `code` field that
mirrors the API's `error.code`. The HTTP layer retries `5xx`, `429`, and
transport errors with exponential backoff; you only see one final exception.

| Variant | Triggers |
|---------|----------|
| `AuthenticationError` / `Authentication` | 401, 403 |
| `NotFoundError` / `NotFound` | 404 |
| `ValidationError` / `Validation` | 400, 422 |
| `RateLimitError` / `RateLimit` | 429 (with `retry_after_seconds`) |
| `NetworkError` / `Network` | DNS, TLS, timeout |
| `ChainBridgeError` / `Api` | Other non-2xx responses |

## Wallet integration

Each SDK ships a chain-agnostic `WalletAdapter` interface plus an
`HtlcWalletAdapter` extension for locking, claiming, and refunding HTLCs.
A `StubWallet` is provided for tests and dry-runs. Concrete implementations
(Freighter, MetaMask, sats-connect, Phantom, raw key signers) are intentionally
left as application concerns so the SDK's footprint stays minimal.

See:

- [`sdks/typescript/src/wallets/`](../sdks/typescript/src/wallets) — TS adapter contracts
- [`sdks/python/chainbridge/wallets.py`](../sdks/python/chainbridge/wallets.py) — Python protocols
- [`sdks/rust/src/wallets.rs`](../sdks/rust/src/wallets.rs) — Rust async traits

## Real-time events

```ts
const ws = client.createWebSocket();
await ws.connect();
ws.subscribe("swaps", (e) => console.log(e.type, e.data), { address: "GA..." });
```

```python
ws = client.create_websocket()
ws.subscribe("swaps", on_event, filters={"address": "GA..."})
await ws.start()
```

```rust
let mut ws = ChainBridgeWebSocket::new("wss://api.chainbridge.io/ws")
    .with_api_key(api_key);
ws.subscribe("swaps");
ws.run(|event| println!("{}: {}", event.event_type, event.data)).await?;
```

## Versioning

All SDKs follow semver. The `0.1.x` line targets ChainBridge API `v1`. Breaking
API changes will bump SDK minor versions in lock-step.

## Publishing

The `.github/workflows/sdk-release.yml` workflow publishes each SDK on tag push:

| Tag pattern | SDK | Registry |
|-------------|-----|----------|
| `sdk-ts-vX.Y.Z` | TypeScript | npm |
| `sdk-py-vX.Y.Z` | Python | PyPI |
| `sdk-rs-vX.Y.Z` | Rust | crates.io |

## Examples

End-to-end sample apps live in [`sdks/examples/`](../sdks/examples):

- **Full Swap CLI** — Python walkthrough of an entire HTLC swap (`StubWallet`).
- **Orderbook Watcher** — TypeScript live orderbook over WebSocket.

Per-language quick examples are in each SDK's `examples/` folder.
