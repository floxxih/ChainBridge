# ChainBridge SDKs

Official client libraries for integrating ChainBridge cross-chain atomic swaps into applications.

| SDK | Language | Package | Status |
|-----|----------|---------|--------|
| [`typescript`](./typescript) | TypeScript / JavaScript | `@chainbridge/sdk` | Stable |
| [`python`](./python) | Python 3.9+ | `chainbridge` | Stable |
| [`rust`](./rust) | Rust (1.70+) | `chainbridge-sdk` | Stable |

## What you get

Every SDK exposes the same surface area:

- **REST client** — typed wrappers around all `/api/v1` endpoints (orders, HTLCs, swaps, proofs, market, assets, analytics).
- **WebSocket subscriber** — real-time order, swap, and HTLC event streams.
- **HTLC helpers** — secret/preimage generation, hash-lock derivation, time-lock arithmetic.
- **Wallet helpers** — chain-specific helpers for signing HTLC operations on Stellar, Bitcoin, Ethereum, and Solana (TS only for browser wallets; Python/Rust expose key-based signers).
- **Errors** — shared error taxonomy mirroring the API's `error.code` field.

## Architecture

All SDKs follow a layered design:

```
┌──────────────────────────────────────────────────────┐
│              High-level SwapClient                    │
│  createSwap()  trackSwap()  claimSwap()  refundSwap() │
└──────────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────┐
│  Resource clients: OrdersClient, HtlcClient,          │
│  SwapsClient, MarketClient, AssetsClient, AnalyticsClient │
└──────────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────┐
│   Transport: HTTP (REST) + WebSocket subscriber       │
│   Auth: X-API-Key / Bearer JWT                        │
│   Errors: typed exceptions with API error codes       │
└──────────────────────────────────────────────────────┘
                         │
┌──────────────────────────────────────────────────────┐
│            Crypto primitives (per language)           │
│       SHA-256, secret generation, timelock helpers    │
└──────────────────────────────────────────────────────┘
```

The high-level `SwapClient` orchestrates a full atomic swap so that users only need to call one function to drive the entire flow.

## Versioning

All SDKs follow semantic versioning starting at `0.1.0`. Versions track ChainBridge API minor versions — `0.1.x` SDKs are compatible with API `v1`.

## Publishing

| SDK | Registry | Command |
|-----|----------|---------|
| TypeScript | npm | `npm publish --access public` |
| Python | PyPI | `python -m build && twine upload dist/*` |
| Rust | crates.io | `cargo publish` |

CI publishes on tag pushes; see the SDK release workflow under `.github/workflows/sdk-release.yml`.

## License

MIT — see the repository [LICENSE](../LICENSE).
