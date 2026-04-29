# @chainbridge/sdk

Official TypeScript / JavaScript SDK for [ChainBridge](https://github.com/floxxih/ChainBridge) — a trustless cross-chain atomic swap protocol on Stellar.

## Install

```bash
npm install @chainbridge/sdk
# or
pnpm add @chainbridge/sdk
yarn add @chainbridge/sdk
```

Works in Node.js 18+ and modern browsers (uses `fetch` + WebSocket).

## Quick start

```ts
import { ChainBridgeClient } from "@chainbridge/sdk";

const client = new ChainBridgeClient({
  baseUrl: "https://api.chainbridge.io",
  apiKey: process.env.CHAINBRIDGE_API_KEY,
});

// 1. Discover supported assets
const assets = await client.assets.list({ chain: "stellar" });

// 2. Get a fee estimate
const fees = await client.market.estimateFees({
  from_chain: "stellar",
  to_chain: "bitcoin",
  from_amount: "1000000000",
});

// 3. Create an order with a fresh hash-lock
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
// Save `secret` privately — you reveal it to claim the counterparty leg.
```

## What's in the box

| Module | Purpose |
|--------|---------|
| `ChainBridgeClient` | Top-level entrypoint with all resource clients |
| `client.orders` | Create, list, get, cancel orders |
| `client.htlcs` | Create / claim / refund HTLCs |
| `client.swaps` | Execute and inspect swaps |
| `client.proofs` | Verify cross-chain proofs |
| `client.market` | Fee estimates & exchange rates |
| `client.assets` | Supported assets directory |
| `client.analytics` | Volume + success-rate analytics |
| `client.auth` | Issue / exchange / revoke API keys |
| `ChainBridgeWebSocket` | Real-time event subscriptions |
| `crypto` helpers | `generateSecret`, `deriveHashLock`, `verifySecret`, `recommendedTimelocks` |
| `wallets` (subpath import) | Wallet adapter interfaces (Stellar, Bitcoin, EVM, Solana) |

## Authentication

Pass `apiKey` (recommended for backend integrations) or `bearerToken` (for short-lived sessions):

```ts
const client = new ChainBridgeClient({ apiKey: "cb_xxxxxxxx" });

// Exchange for a JWT
const { access_token } = await client.auth.exchangeForToken();
client.http.setBearerToken(access_token);
```

## Real-time events

```ts
const ws = client.createWebSocket();
await ws.connect();

const unsubscribe = ws.subscribe("swaps", (event) => {
  console.log(event.type, event.data);
}, { address: "GA..." });

// Later
unsubscribe();
ws.close();
```

The WebSocket client reconnects with exponential backoff and re-sends any pending subscriptions on reconnect.

## Errors

Errors thrown by the SDK extend `ChainBridgeError`:

```ts
import {
  ChainBridgeError,
  AuthenticationError,
  RateLimitError,
  NotFoundError,
  ValidationError,
} from "@chainbridge/sdk";

try {
  await client.orders.get("missing");
} catch (err) {
  if (err instanceof NotFoundError) console.log("not found:", err.code);
  else if (err instanceof RateLimitError) console.log("retry after", err.retryAfterSeconds);
  else throw err;
}
```

The HTTP client retries `5xx`, `429`, and network errors with exponential backoff out of the box.

## Wallet helpers

The SDK ships chain-agnostic wallet *interfaces* under the `@chainbridge/sdk/wallets` subpath. Concrete adapters are intentionally kept out of the core bundle so you only pay for what you use:

```ts
import { detectFreighter, detectEvmProvider, type HtlcWalletAdapter } from "@chainbridge/sdk/wallets";

if (detectFreighter().isAvailable) {
  // wire your Stellar adapter (e.g. via @stellar/freighter-api)
}
```

Implement `HtlcWalletAdapter` to plug in any wallet — see [`examples/`](./examples) for fully-worked patterns.

## Examples

- [`examples/create-swap.ts`](./examples/create-swap.ts) — full XLM→BTC swap creation
- [`examples/track-orders.ts`](./examples/track-orders.ts) — WebSocket subscription

## Building

```bash
npm install
npm run build
npm test
```

## Versioning

Semver. The `0.1.x` line targets ChainBridge API `v1`.

## License

MIT
