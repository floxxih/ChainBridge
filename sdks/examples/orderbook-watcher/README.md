# Orderbook Watcher

TypeScript example that renders a live ChainBridge orderbook in the terminal,
seeding state from `GET /api/v1/orders` and updating in real time over the
WebSocket subscription provided by `@chainbridge/sdk`.

```bash
npm install
CHAINBRIDGE_API_KEY=cb_xxx npm run start
```

Replace the rendering function with whatever UI you prefer (React, Ink, etc.) —
the SDK's WebSocket client takes care of subscriptions, reconnection, and
filter routing.
