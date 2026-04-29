# chainbridge-sdk

Official Rust SDK for [ChainBridge](https://github.com/floxxih/ChainBridge) — a trustless cross-chain atomic swap protocol on Stellar.

## Install

```toml
[dependencies]
chainbridge-sdk = "0.1"
tokio = { version = "1", features = ["macros", "rt-multi-thread"] }
```

Optional features:

- `ws` — enables `ChainBridgeWebSocket` for real-time event streaming.
- `native-tls` — use the system TLS stack (defaults to `rustls`).

## Quick start

```rust
use chainbridge_sdk::{
    crypto::{derive_hash_lock, generate_secret_default},
    ChainBridgeClient, ClientConfig, CreateOrderInput,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = ChainBridgeClient::new(ClientConfig {
        base_url: "https://api.chainbridge.io".into(),
        api_key: Some(std::env::var("CHAINBRIDGE_API_KEY")?),
        ..Default::default()
    })?;

    let secret = generate_secret_default();
    let hash_lock = derive_hash_lock(&secret)?;

    let order = client
        .orders()
        .create(&CreateOrderInput {
            from_chain: "stellar".into(),
            to_chain: "bitcoin".into(),
            from_asset: "XLM".into(),
            to_asset: "BTC".into(),
            from_amount: "1000000000".into(),
            to_amount: "10000".into(),
            sender_address: "GA...".into(),
            expiry: 86_400,
        })
        .await?;

    println!("order_id={} hash_lock={hash_lock}", order.order_id);
    Ok(())
}
```

## Resources

| Method | Endpoint family |
|--------|-----------------|
| `client.orders()` | `/api/v1/orders` |
| `client.htlcs()` | `/api/v1/htlcs` |
| `client.swaps()` | `/api/v1/swaps` |
| `client.proofs()` | `/api/v1/proofs` |
| `client.market()` | `/api/v1/market` |
| `client.assets()` | `/api/v1/assets` |
| `client.analytics()` | `/api/v1/analytics` |
| `client.auth()` | `/api/v1/auth` |

## Errors

All resource methods return `Result<_, chainbridge_sdk::Error>`. The variants
match the API's error model (`Authentication`, `NotFound`, `Validation`,
`RateLimit`, `Api`, `Network`, `Decode`, `Config`).

The HTTP client retries 5xx, 429, and transport errors with exponential backoff.

## WebSocket events

```rust
use chainbridge_sdk::websocket::ChainBridgeWebSocket;

let mut ws = ChainBridgeWebSocket::new("wss://api.chainbridge.io/ws")
    .with_api_key(std::env::var("CHAINBRIDGE_API_KEY")?);
ws.subscribe("orders");
ws.run(|event| println!("{}: {}", event.event_type, event.data)).await?;
```

## Wallet helpers

`chainbridge_sdk::wallets` defines `WalletAdapter` and `HtlcWalletAdapter`
async traits plus a `StubWallet` implementation for tests. Pair these with
your chosen on-chain SDK (e.g. `stellar-sdk`, `bitcoin`, `web3`).

## Examples

- `cargo run --example create_swap`
- `cargo run --example track_orders --features ws`

## License

MIT
