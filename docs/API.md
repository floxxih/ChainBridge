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

Currently, the API uses public endpoints. Future versions will include:

- API Key authentication for high-volume users
- OAuth 2.0 for wallet-based authentication
- Rate limiting per IP/API key

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

## Support

- GitHub Issues: https://github.com/floxxih/ChainBridge/issues
- Discord: https://discord.gg/chainbridge
- Email: support@chainbridge.io
