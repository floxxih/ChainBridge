# API Response Validation

This document describes the runtime validation system for API responses using Zod schemas.

## Overview

All critical API endpoints now validate responses at runtime to guard against malformed payloads. This provides:

- **Type safety at runtime**: Ensures API responses match expected TypeScript types
- **User-safe error messages**: Validation errors are mapped to friendly messages
- **Triage logging**: Invalid payloads are logged for debugging and monitoring

## Architecture

### Components

1. **Zod Schemas** (`frontend/src/lib/api/schemas.ts`)
   - Defines validation schemas for all API response types
   - Mirrors TypeScript interfaces with runtime validation

2. **Validation Utilities** (`frontend/src/lib/api/validation.ts`)
   - `validateApiResponse()`: Validates and throws on error
   - `validateApiResponseSafe()`: Validates and returns null on error
   - `isValidationError()`: Type guard for validation errors
   - `ValidationError`: Custom error class with validation details

3. **API Client Integration** (`frontend/src/lib/api/client.ts`)
   - Automatic validation in `createApiClient()`
   - Optional validation via `enableValidation` flag (default: true)
   - Schemas passed to HTTP methods (get, post, patch)

## Usage

### Basic Usage

Validation is automatic for all API endpoints:

```typescript
import { listOrders } from "@/lib/api";

// Automatically validated against ApiOrderListSchema
const orders = await listOrders({ status: "open" });
```

### Error Handling

```typescript
import { listOrders, isValidationError } from "@/lib/api";

try {
  const orders = await listOrders();
} catch (error) {
  if (isValidationError(error)) {
    // Handle validation error
    console.error("Invalid API response:", error.message);
    console.error("Validation details:", error.validationErrors);
  } else {
    // Handle other errors
    console.error("API error:", error);
  }
}
```

### Safe Validation

For non-critical endpoints where you want to handle invalid data gracefully:

```typescript
import { validateApiResponseSafe, ApiOrderRecordSchema } from "@/lib/api";

const data = await fetch("/api/orders/123").then((r) => r.json());
const order = validateApiResponseSafe(data, ApiOrderRecordSchema, "/orders/123");

if (order === null) {
  // Handle invalid data
  console.warn("Received invalid order data");
} else {
  // Use validated data
  console.log("Order:", order);
}
```

### Disabling Validation

For testing or debugging, you can disable validation:

```typescript
import { createApiClient } from "@/lib/api/client";

const client = createApiClient({
  basePath: "/orders",
  enableValidation: false, // Disable validation
});
```

## Validated Endpoints

### Core Endpoints

#### Orders API

- `GET /orders` - List orders
- `GET /orders/:id` - Get order
- `POST /orders` - Create order
- `POST /orders/:id/match` - Match order
- `POST /orders/:id/cancel` - Cancel order

#### HTLCs API

- `GET /htlcs` - List HTLCs
- `GET /htlcs/:id` - Get HTLC
- `GET /htlcs/:id/status` - Get HTLC status
- `POST /htlcs` - Create HTLC
- `POST /htlcs/:id/claim` - Claim HTLC
- `POST /htlcs/:id/refund` - Refund HTLC

#### Swaps API

- `GET /swaps` - List swaps
- `GET /swaps/:id` - Get swap
- `POST /swaps/:id/verify-proof` - Verify swap proof

#### Admin API

- `GET /admin/stats` - Admin statistics
- `GET /admin/volume` - Volume data
- `GET /admin/htlcs/active` - Active HTLCs
- `GET /admin/chains` - Chain health
- `GET /admin/users` - User metrics
- `GET /admin/alerts` - List alerts
- `POST /admin/alerts` - Create alert
- `PATCH /admin/alerts/:id` - Update alert
- `GET /admin/disputes` - List disputes
- `GET /admin/disputes/stats` - Dispute stats
- `POST /admin/disputes/:id/review` - Review dispute
- `POST /admin/disputes/:id/resolve` - Resolve dispute

#### Quote API

- `POST /market/rates/calculate` - Calculate rate
- `POST /market/fees/estimate` - Estimate fees
- `POST /timelock/validate` - Validate timelock

## Error Messages

Validation errors are mapped to user-friendly messages:

### Example Error Messages

```
"Invalid server response: id: Expected string, received number"
"Invalid server response: from_amount: Expected number, received string, status: Required (and 3 more)"
"The server returned invalid data"
```

### Error Structure

```typescript
{
  name: "ValidationError",
  message: "Invalid server response: ...",
  status: 502, // Bad Gateway
  code: "VALIDATION_ERROR",
  validationErrors: [
    {
      path: ["from_amount"],
      message: "Expected number, received string",
      code: "invalid_type"
    }
  ],
  details: {
    validationErrors: [...],
    rawPayload: {...}
  }
}
```

## Logging

Invalid payloads are automatically logged for triage:

### Console Logging

```javascript
[API Validation Error] {
  endpoint: "/orders",
  schema: "ApiOrderListSchema",
  timestamp: "2024-01-01T00:00:00.000Z",
  errors: [...],
  payload: "{...}"
}
```

### External Monitoring

If `window.errorMonitor` is available, validation errors are sent to external monitoring:

```typescript
window.errorMonitor.logValidationError({
  endpoint: "/orders",
  schema: "ApiOrderListSchema",
  errors: [...],
  payload: {...}
});
```

## Adding New Endpoints

To add validation for a new endpoint:

1. **Define the schema** in `frontend/src/lib/api/schemas.ts`:

```typescript
export const MyNewRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  value: z.number(),
});
```

2. **Use the schema** in your API function:

```typescript
import { MyNewRecordSchema } from "@/lib/api/schemas";

export function getMyRecord(id: string) {
  return client.get<MyNewRecord>(`/${id}`, undefined, MyNewRecordSchema);
}
```

3. **Export the schema** from `frontend/src/lib/api/index.ts` if needed externally.

## Testing

Run validation tests:

```bash
npm test -- apiValidation.test.ts
```

## Best Practices

1. **Always validate critical endpoints**: Orders, HTLCs, Swaps, Admin operations
2. **Use safe validation for optional data**: Non-critical endpoints, cached data
3. **Handle validation errors gracefully**: Show user-friendly messages
4. **Monitor validation errors**: Track patterns to identify API issues
5. **Keep schemas in sync**: Update schemas when API types change

## Acceptance Criteria

✅ **Core endpoints have schemas**: All critical endpoints (Orders, HTLCs, Swaps, Admin, Quotes) have Zod schemas

✅ **Validation errors map to user-safe messages**: Errors are formatted as friendly messages without exposing internal details

✅ **Invalid payloads are logged for triage**: All validation failures are logged to console and external monitoring if available

## Future Enhancements

- Add validation metrics dashboard
- Implement automatic schema generation from OpenAPI spec
- Add validation error recovery strategies
- Create validation error analytics
