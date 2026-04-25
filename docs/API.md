# ChainBridge API Documentation

## Overview

The ChainBridge API provides RESTful endpoints for creating and managing cross-chain atomic swaps. The API is built with FastAPI and provides both synchronous and asynchronous operations.

## Base URL

```
Production: https://api.chainbridge.io
Staging: https://api-staging.chainbridge.io
Development: http://localhost:8000
```

## Authentication

Protected endpoints require an `X-API-Key` header. Keys are prefixed with `cb_`.

```
X-API-Key: cb_<your-api-key>
```

### Obtain an API Key

```http
POST /api/v1/auth/api-keys
Content-Type: application/json

{
  "name": "my-integration",
  "owner": "your-identifier"
}
```

Response:

```json
{
  "id": "key-uuid",
  "key": "cb_xxxxxxxxxxxxxxxxxxxxx",
  "name": "my-integration",
  "owner": "your-identifier",
  "is_active": true,
  "created_at": "2026-04-25T10:00:00Z"
}
```

> **Save the key immediately — it is only shown once.**

### Exchange Key for JWT

For session-based flows, exchange your API key for a short-lived JWT:

```http
POST /api/v1/auth/token
X-API-Key: cb_xxxxxxxxxxxxxxxxxxxxx
```

Response:

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

Use the token in subsequent requests:

```
Authorization: Bearer eyJ...
```

### Revoke a Key

```http
DELETE /api/v1/auth/api-keys/{key_id}
X-API-Key: cb_xxxxxxxxxxxxxxxxxxxxx
```

## Response Format

All responses follow this structure:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

## Endpoints

### Health Check

#### GET /health

Check API health status.

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "timestamp": "2026-03-24T12:00:00Z"
  },
  "error": null
}
```

---

### Swap Orders

#### POST /orders

Create a new swap order.

**Request:**

```json
{
  "from_chain": "stellar",
  "to_chain": "bitcoin",
  "from_asset": "XLM",
  "to_asset": "BTC",
  "from_amount": "1000000000",
  "to_amount": "10000",
  "sender_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
  "expiry": 86400
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| from_chain | string | Yes | Source chain (stellar, bitcoin, ethereum, solana) |
| to_chain | string | Yes | Destination chain |
| from_asset | string | Yes | Asset to send (e.g., XLM, BTC, ETH) |
| to_asset | string | Yes | Asset to receive |
| from_amount | string | Yes | Amount in smallest unit (stroops, satoshis, wei) |
| to_amount | string | Yes | Desired amount |
| sender_address | string | Yes | Sender's address on source chain |
| expiry | integer | Yes | Order expiry in seconds from now |

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "12345",
    "status": "open",
    "hash_lock": "a1b2c3d4...",
    "created_at": "2026-03-24T12:00:00Z",
    "expires_at": "2026-03-25T12:00:00Z"
  },
  "error": null
}
```

#### GET /orders/{order_id}

Get order details.

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "12345",
    "from_chain": "stellar",
    "to_chain": "bitcoin",
    "from_asset": "XLM",
    "to_asset": "BTC",
    "from_amount": "1000000000",
    "to_amount": "10000",
    "creator": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
    "status": "open",
    "expiry": "2026-03-25T12:00:00Z",
    "created_at": "2026-03-24T12:00:00Z"
  },
  "error": null
}
```

#### GET /orders

List swap orders with optional filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| from_chain | string | all | Filter by source chain |
| to_chain | string | all | Filter by destination chain |
| status | string | open | Filter by status (open, matched, cancelled, expired) |
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page (max 100) |

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [...],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "pages": 8
    }
  },
  "error": null
}
```

#### DELETE /orders/{order_id}

Cancel an open order.

**Response:**

```json
{
  "success": true,
  "data": {
    "order_id": "12345",
    "status": "cancelled"
  },
  "error": null
}
```

---

### HTLC Operations

#### POST /htlc

Create an HTLC on Stellar.

**Request:**

```json
{
  "sender_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
  "receiver_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
  "amount": "1000000000",
  "hash_lock": "a1b2c3d4e5f6...",
  "time_lock": 86400
}
```

**Parameters:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| sender_address | string | Yes | Address creating the HTLC |
| receiver_address | string | Yes | Address that can claim |
| amount | string | Yes | Amount in stroops |
| hash_lock | string | Yes | 32-byte hash (hex encoded) |
| time_lock | integer | Yes | Duration in seconds |

**Response:**

```json
{
  "success": true,
  "data": {
    "htlc_id": "67890",
    "tx_hash": "abc123...",
    "status": "active",
    "created_at": "2026-03-24T12:00:00Z",
    "expires_at": "2026-03-25T12:00:00Z"
  },
  "error": null
}
```

#### GET /htlc/{htlc_id}

Get HTLC details.

**Response:**

```json
{
  "success": true,
  "data": {
    "htlc_id": "67890",
    "sender": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
    "receiver": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
    "amount": "1000000000",
    "hash_lock": "a1b2c3d4...",
    "time_lock": "2026-03-25T12:00:00Z",
    "status": "active",
    "created_at": "2026-03-24T12:00:00Z"
  },
  "error": null
}
```

---

### Disputes

#### POST /disputes

Submit a dispute for a problematic swap requiring manual intervention.

**Request:**

```json
{
  "swap_id": "f2f9bcdc-9f85-4f56-9d6f-a57de0fdad83",
  "submitted_by": "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7",
  "category": "timeout",
  "reason": "Counterparty did not complete second leg after lock period.",
  "priority": "high",
  "evidence": [
    {
      "type": "tx_hash",
      "value": "0xabc123",
      "description": "Outbound lock transaction"
    }
  ]
}
```

#### POST /disputes/{dispute_id}/evidence

Append additional evidence to an existing dispute.

#### GET /disputes

List disputes (supports filtering by submitter and status).

#### Admin endpoints

- `GET /admin/disputes`
- `GET /admin/disputes/stats`
- `POST /admin/disputes/{dispute_id}/review`
- `POST /admin/disputes/{dispute_id}/resolve`

See [DISPUTES.md](./DISPUTES.md) for full workflow and operational guidance.

#### POST /htlc/{htlc_id}/claim

Claim an HTLC by revealing the secret.

**Request:**

```json
{
  "secret": "secret_preimage_here...",
  "claimer_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "htlc_id": "67890",
    "status": "claimed",
    "tx_hash": "def456...",
    "claimed_at": "2026-03-24T12:30:00Z"
  },
  "error": null
}
```

#### POST /htlc/{htlc_id}/refund

Refund an HTLC after timelock expiry.

**Request:**

```json
{
  "refunder_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "htlc_id": "67890",
    "status": "refunded",
    "tx_hash": "ghi789...",
    "refunded_at": "2026-03-25T12:30:00Z"
  },
  "error": null
}
```

---

### Swaps

#### POST /swaps

Execute a cross-chain swap.

**Request:**

```json
{
  "order_id": "12345",
  "counterparty_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
  "destination_htlc_tx": "btc_tx_hash...",
  "proof": {
    "chain": "bitcoin",
    "tx_hash": "btc_tx_hash...",
    "block_height": 850000,
    "proof_data": "merkle_proof..."
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "swap_id": "54321",
    "stellar_htlc_id": "67890",
    "status": "initiated",
    "created_at": "2026-03-24T12:00:00Z"
  },
  "error": null
}
```

#### GET /swaps/{swap_id}

Get swap details.

**Response:**

```json
{
  "success": true,
  "data": {
    "swap_id": "54321",
    "order_id": "12345",
    "from_chain": "stellar",
    "to_chain": "bitcoin",
    "from_htlc_id": "67890",
    "to_htlc_tx": "btc_tx_hash...",
    "status": "completed",
    "created_at": "2026-03-24T12:00:00Z",
    "completed_at": "2026-03-24T12:30:00Z"
  },
  "error": null
}
```

#### GET /swaps

List swaps with filters.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| status | string | all | Filter by status |
| from_chain | string | all | Filter by source chain |
| to_chain | string | all | Filter by destination chain |
| address | string | all | Filter by participant address |
| page | integer | 1 | Page number |
| limit | integer | 20 | Items per page |

---

### Proofs

#### POST /proofs/verify

Verify a cross-chain proof.

**Request:**

```json
{
  "chain": "bitcoin",
  "tx_hash": "btc_tx_hash...",
  "block_height": 850000,
  "proof_data": "merkle_proof_hex...",
  "expected_htlc_params": {
    "sender": "bc1q...",
    "receiver": "bc1q...",
    "amount": "10000",
    "hash_lock": "a1b2c3..."
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "valid": true,
    "htlc_params_match": true,
    "block_confirmations": 6,
    "verified_at": "2026-03-24T12:00:00Z"
  },
  "error": null
}
```

---

### Market Data & Fees

#### GET /api/v1/market/fees/{chain}

Get current fee estimate for a chain.

**Path Parameters:** `chain` — one of `stellar`, `bitcoin`, `ethereum`, `solana`

**Response:**

```json
{
  "chain": "stellar",
  "base_fee": 100,
  "fee_unit": "stroops",
  "estimated_seconds": 5
}
```

#### POST /api/v1/market/fees/estimate

Estimate the full fee breakdown for a swap.

**Request:**

```json
{
  "from_chain": "stellar",
  "to_chain": "bitcoin",
  "from_amount": "1000000000"
}
```

**Response:**

```json
{
  "network_fees": { "stellar": 100, "bitcoin": 2500 },
  "protocol_fee_bps": 10,
  "total_fee_usd": "0.42"
}
```

#### GET /api/v1/market/rate

Get current exchange rate between two assets.

**Query Parameters:** `from_asset`, `to_asset`

---

### Assets

#### GET /api/v1/assets

List supported assets.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| chain | string | Filter by chain |
| symbol | string | Filter by symbol (partial match) |
| verified | boolean | Only verified assets |
| search | string | Search name or symbol |
| limit | integer | Max results (default 50, max 100) |
| offset | integer | Pagination offset |

**Response:**

```json
[
  {
    "id": "asset-uuid",
    "chain": "stellar",
    "symbol": "XLM",
    "name": "Stellar Lumens",
    "decimals": 7,
    "is_verified": true,
    "is_active": true
  }
]
```

---

### Analytics

#### GET /analytics/volume

Get swap volume statistics.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| chain | string | all | Filter by chain |
| period | string | 24h | Time period (1h, 24h, 7d, 30d) |
| asset | string | all | Filter by asset |

**Response:**

```json
{
  "success": true,
  "data": {
    "total_volume": "150000000000",
    "volume_by_chain": {
      "stellar": "100000000000",
      "bitcoin": "25000000000",
      "ethereum": "25000000000"
    },
    "volume_by_asset": {
      "XLM": "100000000000",
      "BTC": "1000000000",
      "ETH": "5000000000"
    },
    "swap_count": 150,
    "period": "24h"
  },
  "error": null
}
```

#### GET /analytics/success-rate

Get swap success rate.

**Response:**

```json
{
  "success": true,
  "data": {
    "success_rate": 0.95,
    "total_swaps": 150,
    "successful_swaps": 142,
    "failed_swaps": 5,
    "expired_swaps": 3,
    "period": "24h"
  },
  "error": null
}
```

---

### WebSocket Events

Connect to `wss://api.chainbridge.io/ws` for real-time updates.

#### Subscribe to Events

```json
{
  "action": "subscribe",
  "channel": "orders"
}
```

```json
{
  "action": "subscribe",
  "channel": "swaps",
  "filters": {
    "address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK"
  }
}
```

#### Event Types

**Order Created:**

```json
{
  "type": "order_created",
  "data": {
    "order_id": "12345",
    "from_chain": "stellar",
    "to_chain": "bitcoin",
    "from_asset": "XLM",
    "to_asset": "BTC",
    "from_amount": "1000000000",
    "to_amount": "10000",
    "created_at": "2026-03-24T12:00:00Z"
  }
}
```

**Swap Status Changed:**

```json
{
  "type": "swap_status_changed",
  "data": {
    "swap_id": "54321",
    "status": "completed",
    "updated_at": "2026-03-24T12:30:00Z"
  }
}
```

**HTLC Event:**

```json
{
  "type": "htlc_event",
  "data": {
    "event": "claimed",
    "htlc_id": "67890",
    "secret_revealed": "a1b2c3...",
    "tx_hash": "abc123...",
    "timestamp": "2026-03-24T12:30:00Z"
  }
}
```

---

## Rate Limits

| Endpoint | Limit |
|----------|-------|
| POST /orders | 10/minute |
| POST /htlc | 10/minute |
| GET endpoints | 60/minute |
| WebSocket | 5 connections |

## Error Codes

| Code | Description |
|------|-------------|
| INVALID_CHAIN | Chain not supported |
| INVALID_AMOUNT | Amount must be positive |
| INVALID_HASH | Invalid hash lock format |
| INVALID_TIMELOCK | Timelock must be in the future |
| HTLC_NOT_FOUND | HTLC does not exist |
| HTLC_EXPIRED | HTLC has expired |
| HTLC_CLAIMED | HTLC already claimed |
| HTLC_REFUNDED | HTLC already refunded |
| INVALID_SECRET | Secret does not match hash |
| ORDER_NOT_FOUND | Order does not exist |
| ORDER_EXPIRED | Order has expired |
| ORDER_ALREADY_MATCHED | Order already matched |
| UNAUTHORIZED | Not authorized for this operation |
| PROOF_INVALID | Proof verification failed |
| INTERNAL_ERROR | Internal server error |

## SDK Examples

### Python

```python
import requests

BASE_URL = "http://localhost:8000"

# Create order
response = requests.post(f"{BASE_URL}/orders", json={
    "from_chain": "stellar",
    "to_chain": "bitcoin",
    "from_asset": "XLM",
    "to_asset": "BTC",
    "from_amount": "1000000000",
    "to_amount": "10000",
    "sender_address": "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK",
    "expiry": 86400
})

print(response.json())
```

### JavaScript

```javascript
const API_URL = 'http://localhost:8000';

async function createOrder(orderData) {
  const response = await fetch(`${API_URL}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(orderData),
  });
  
  return response.json();
}

const order = await createOrder({
  from_chain: 'stellar',
  to_chain: 'bitcoin',
  from_asset: 'XLM',
  to_asset: 'BTC',
  from_amount: '1000000000',
  to_amount: '10000',
  sender_address: 'GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK',
  expiry: 86400
});

console.log(order);
```

## Testing

Use the Stellar testnet for testing:

```bash
# Testnet endpoint
export STELLAR_NETWORK=testnet
export SOROBAN_RPC_URL=https://soroban-testnet.stellar.org
```

## Changelog

### v0.1.0 (Current)

- Initial API release
- Basic swap order management
- HTLC creation, claim, and refund
- Cross-chain proof verification
- WebSocket event streaming

---

---

## Integration Guide

### Complete Swap Walkthrough

The typical integration flow for an atomic swap:

```
1. GET  /api/v1/assets                 → discover supported assets
2. POST /api/v1/market/fees/estimate   → get fee breakdown before quoting
3. POST /api/v1/orders                 → create a swap order
4. [Wait for counterparty match via WebSocket]
5. POST /api/v1/htlcs                  → lock funds on source chain
6. POST /api/v1/swaps                  → register the swap
7. POST /api/v1/htlcs/{id}/claim       → claim with secret once counterparty locks
8. GET  /api/v1/swaps/{swap_id}        → confirm final status
```

### TypeScript Client Example

```typescript
const BASE = "https://api.chainbridge.io/api/v1";
const headers = { "Content-Type": "application/json", "X-API-Key": "cb_..." };

async function getQuote(fromChain: string, toChain: string, amount: string) {
  const res = await fetch(`${BASE}/market/fees/estimate`, {
    method: "POST",
    headers,
    body: JSON.stringify({ from_chain: fromChain, to_chain: toChain, from_amount: amount }),
  });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

async function createOrder(payload: object) {
  const res = await fetch(`${BASE}/orders`, { method: "POST", headers, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`API error ${res.status}`);
  return res.json();
}

// WebSocket for real-time order status
const ws = new WebSocket("wss://api.chainbridge.io/ws");
ws.onopen = () => ws.send(JSON.stringify({ action: "subscribe", channel: "swaps" }));
ws.onmessage = (e) => console.log("event", JSON.parse(e.data));
```

### Error Handling Best Practices

```typescript
async function apiCall<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const body = await res.json();
  if (!res.ok) {
    // body.detail is FastAPI's error format
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return body as T;
}
```

Retry on `429 Too Many Requests` with exponential backoff. Do not retry `4xx` errors other than `429`.

---

## Source Maps & Error Monitoring

Frontend source maps are generated during `next build` and stored in `.next/`.

**Upload process:**

1. Build: `npm run build` — source maps in `.next/static/chunks/`
2. Upload maps to your error-monitoring service before deploying:
   ```bash
   # Example with a generic upload (adapt to your provider)
   for map in .next/static/chunks/*.map; do
     curl -F "file=@$map" https://errors.example.com/sourcemaps/upload \
          -H "Authorization: Bearer $ERROR_SERVICE_TOKEN"
   done
   ```
3. Set `NEXT_PUBLIC_ERROR_REPORT_URL` in production to enable automatic error capture.

**PII-safe error context strategy:**

- All error reports are scrubbed of keys matching: `address`, `wallet`, `email`, `key`, `secret`, `token`, `seed`, `mnemonic` before transmission (see `src/lib/errorMonitor.ts`).
- Never pass raw user input or wallet addresses as error context — pass anonymised identifiers (e.g., chain name, order ID) instead.
- Error payloads contain: `message`, `stack`, `url` (path only — query strings stripped), `timestamp`.

---

## Support

- GitHub Issues: https://github.com/floxxih/ChainBridge/issues
- Discord: https://discord.gg/chainbridge
- Email: support@chainbridge.io
