# WebSocket Real-Time Notifications

ChainBridge exposes a single WebSocket endpoint that pushes real-time events for swaps, HTLCs, and orders. This document describes the protocol, available channels, event schema, and client integration guide.

---

## Connection

```
wss://<host>/api/v1/ws?token=<JWT>
```

Authentication is performed via a JWT passed in the `token` query parameter. The token is obtained from `POST /api/v1/auth/token` using an API key.

A connection that supplies no token, or an invalid token, is closed immediately with code `1008 Policy Violation`.

### Welcome message

Upon a successful connection the server sends:

```json
{
  "type": "connected",
  "channels": ["swaps", "swap:", "htlcs", "htlc:", "orders", "order:"]
}
```

---

## Channels

| Channel | Description |
|---|---|
| `swaps` | All swap state-change events |
| `swap:<id>` | Events for a single swap identified by UUID |
| `htlcs` | All HTLC lifecycle events |
| `htlc:<id>` | Events for a single HTLC identified by UUID |
| `orders` | All order-book events |
| `order:<id>` | Events for a single order identified by UUID |

Targeted channels (e.g. `swap:abc-123`) are useful for detail pages; broadcast channels are useful for dashboards.

---

## Client → Server Messages

All client messages are JSON objects with a `type` field.

### `subscribe`

Start receiving events for a channel. An optional `event_types` array restricts the stream to the listed event types.

```json
{
  "type": "subscribe",
  "channel": "swaps",
  "event_types": ["swap.status_changed", "swap.proof_verified"]
}
```

| Field | Required | Description |
|---|---|---|
| `channel` | ✅ | Channel name (see table above) |
| `event_types` | ❌ | Allowlist of event type strings. Omit to receive all events. |

**Response:**

```json
{ "type": "subscribed", "channel": "swaps", "event_types": ["swap.status_changed"] }
```

### `unsubscribe`

Stop receiving events for a channel.

```json
{ "type": "unsubscribe", "channel": "swaps" }
```

**Response:**

```json
{ "type": "unsubscribed", "channel": "swaps" }
```

### `update_preferences`

Change the event-type filter for an existing subscription without re-subscribing.

```json
{
  "type": "update_preferences",
  "channel": "swaps",
  "event_types": ["swap.completed", "swap.failed"]
}
```

**Response:**

```json
{ "type": "preferences_updated", "channel": "swaps", "event_types": ["swap.completed", "swap.failed"] }
```

### `ping`

Client-initiated keepalive.

```json
{ "type": "ping" }
```

**Response:**

```json
{ "type": "pong" }
```

---

## Server → Client Messages

### Event envelope

Every broadcast event follows this structure:

```json
{
  "channel": "swaps",
  "data": {
    "event_type": "swap.status_changed",
    "timestamp": "2026-03-27T12:00:00.000000+00:00",
    "channel": "swap:abc-123",
    "data": { ... }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `channel` | string | The channel the message was delivered on |
| `data.event_type` | string | One of the event types listed below |
| `data.timestamp` | ISO-8601 | UTC timestamp of the event |
| `data.channel` | string | Targeted channel (e.g. `swap:<id>`) |
| `data.data` | object | Domain object payload |

### Server-initiated ping

The server sends a ping every 30 seconds to detect stale connections. The `useWebSocket` hook responds automatically.

```json
{ "type": "ping" }
```

---

## Event Types

### Swap events

| Event type | Trigger |
|---|---|
| `swap.created` | A new swap record is created by an indexer |
| `swap.status_changed` | Any swap state transition |
| `swap.proof_verified` | `POST /swaps/{id}/verify-proof` succeeds |
| `swap.completed` | Swap reaches its terminal success state |
| `swap.failed` | Swap reaches a terminal failure state |

Example `swap.proof_verified` payload:

```json
{
  "event_type": "swap.proof_verified",
  "timestamp": "2026-03-27T12:00:00+00:00",
  "channel": "swap:abc-123",
  "data": {
    "id": "abc-123",
    "onchain_id": "...",
    "stellar_htlc_id": "...",
    "other_chain": "ethereum",
    "other_chain_tx": "0xabc...",
    "stellar_party": "G...",
    "other_party": "0x...",
    "state": "executed",
    "created_at": "2026-03-27T11:00:00+00:00"
  }
}
```

### HTLC events

| Event type | Trigger |
|---|---|
| `htlc.created` | `POST /htlcs/` |
| `htlc.claimed` | `POST /htlcs/{id}/claim` |
| `htlc.refunded` | `POST /htlcs/{id}/refund` |
| `htlc.expired` | HTLC time_lock passes (emitted by indexer) |

Example `htlc.claimed` payload:

```json
{
  "event_type": "htlc.claimed",
  "timestamp": "2026-03-27T12:00:00+00:00",
  "channel": "htlc:def-456",
  "data": {
    "id": "def-456",
    "sender": "G...",
    "receiver": "G...",
    "amount": 1000000,
    "hash_lock": "abc...",
    "time_lock": 1711540800,
    "status": "claimed",
    "secret": "pre-image-here",
    "hash_algorithm": "sha256",
    "created_at": "2026-03-27T11:00:00+00:00"
  }
}
```

### Order events

| Event type | Trigger |
|---|---|
| `order.created` | `POST /orders/` |
| `order.matched` | `POST /orders/{id}/match` |
| `order.cancelled` | `POST /orders/{id}/cancel` |
| `order.filled` | `POST /orders/{id}/match` when fully filled |

Example `order.matched` payload:

```json
{
  "event_type": "order.matched",
  "timestamp": "2026-03-27T12:00:00+00:00",
  "channel": "order:ghi-789",
  "data": {
    "id": "ghi-789",
    "creator": "G...",
    "from_chain": "stellar",
    "to_chain": "ethereum",
    "from_asset": "XLM",
    "to_asset": "ETH",
    "from_amount": 10000,
    "to_amount": 45,
    "status": "matched",
    "counterparty": "0x...",
    "created_at": "2026-03-27T11:00:00+00:00"
  }
}
```

---

## Connection Management

### Auto-reconnect (frontend)

The `useWebSocket` hook implements exponential backoff reconnection:

- Initial delay: **1 s**
- Multiplier: **×2** per failed attempt
- Maximum delay: **30 s**
- All channel subscriptions and their event-type filters are **automatically re-sent** once the connection is restored.

### Heartbeat

The server pings every 30 seconds. If the `send_text` call fails, the connection is treated as stale and cleaned up server-side. The frontend hook responds to server pings with a `pong`.

---

## Notification Preferences

Users can control which events they want to receive per channel:

```ts
// Subscribe to all swap events
subscribe('swaps', handler);

// Subscribe only to completion events
subscribe('swaps', handler, { eventTypes: ['swap.completed', 'swap.failed'] });

// Update filter for an existing subscription
updatePreferences('swaps', ['swap.status_changed']);
```

Server-side, these filters are evaluated before each message is delivered — no extra traffic is sent to the client.

---

## JavaScript / TypeScript Client Example

```ts
import { useWebSocket } from '@/hooks/useWebSocket';

const { isConnected, subscribe, updatePreferences } = useWebSocket(
  'wss://api.example.com/api/v1/ws',
  jwtToken,
);

useEffect(() => {
  if (!isConnected) return;

  // Broadcast channel – all swaps
  const unsubSwaps = subscribe('swaps', (event) => {
    console.log(event.event_type, event.data);
  });

  // Targeted channel – one specific swap
  const unsubSwap = subscribe('swap:abc-123', (event) => {
    setSwapState(event.data.state);
  });

  // Only claim/refund notifications for HTLCs
  const unsubHtlcs = subscribe('htlcs', handleHtlc, {
    eventTypes: ['htlc.claimed', 'htlc.refunded'],
  });

  return () => {
    unsubSwaps();
    unsubSwap();
    unsubHtlcs();
  };
}, [isConnected, subscribe]);
```

---

## Error Messages

If the server rejects a message it sends:

```json
{ "type": "error", "message": "Unknown channel: foo" }
```

---

## Related

- [API Reference](./API.md)
- [Architecture Overview](./ARCHITECTURE.md)
- [Security](./SECURITY.md)
