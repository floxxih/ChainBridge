# Order Filtering Feature

## Overview

This document describes the order filtering implementation for the ChainBridge marketplace, addressing issue #209.

## Features Implemented

### 1. Combined Filters

Users can apply multiple filters simultaneously to refine the order book:

- **Search**: Text search across pair names, token symbols, and maker addresses
- **Side Filter**: Filter by order side (All, Buys, Sells)
- **Chain Filter**: Filter by source and destination chain pairs (e.g., "Ethereum → Stellar")
- **Asset Filter**: Filter by token assets (e.g., BTC, ETH, USDC)

All filters work together - applying multiple filters shows only orders that match ALL criteria.

### 2. URL Query Parameters

All filter states are synchronized with URL query parameters:

- `search` - Search query string
- `side` - Order side filter (buy/sell/all)
- `chain` - Chain pair filter
- `asset` - Asset filter

**Benefits:**

- Shareable URLs with pre-applied filters
- Browser back/forward navigation works correctly
- Bookmarkable filter combinations
- Deep linking support

**Example URLs:**

```
/marketplace?search=BTC&side=buy
/marketplace?chain=Ethereum%20%E2%86%92%20Stellar&asset=USDC
/marketplace?search=ETH&side=sell&asset=USDC
```

### 3. Reset Filters

A "Reset" button appears when any filters are active:

- Clears all filter states
- Returns to showing the full order list
- Updates URL to remove all query parameters
- Provides clear visual feedback

The reset button is conditionally rendered - it only appears when at least one filter is active, keeping the UI clean when not needed.

## Technical Implementation

### State Management

- Filter states are managed with React `useState` hooks
- Initial state is derived from URL query parameters
- Two-way synchronization between state and URL

### URL Synchronization

```typescript
// Sync filters to URL
useEffect(() => {
  const params = new URLSearchParams();
  // Update params based on filter state
  router.replace(targetUrl, { scroll: false });
}, [search, sideFilter, chainPairFilter, assetFilter]);

// Sync URL to filters
useEffect(() => {
  setSearch(searchParams.get("search") ?? "");
  setSideFilter(searchParams.get("side") ?? "all");
  // ... other filters
}, [searchParams]);
```

### Filter Logic

Orders are filtered using a `useMemo` hook for performance:

```typescript
const filteredOrders = useMemo(() => {
  return orders.filter((order) => {
    const matchesSearch = /* search logic */;
    const matchesSide = /* side logic */;
    const matchesChain = /* chain logic */;
    const matchesAsset = /* asset logic */;
    return matchesSearch && matchesSide && matchesChain && matchesAsset;
  });
}, [orders, search, sideFilter, chainPairFilter, assetFilter]);
```

## User Experience

### Filter Controls Layout

```
[Search Input] [All] [Buys] [Sells] [Chain Dropdown] [Asset Dropdown] [Reset]
```

### Empty State

When no orders match the current filters:

- Clear message: "No active orders matching filters."
- "Clear Filters" button to reset
- Helpful icon for visual clarity

### Visual Feedback

- Active filter buttons have distinct styling
- Reset button only appears when needed
- Dropdown menus show current selection
- Search input shows current query

## Testing

Comprehensive test suite in `frontend/src/__tests__/orderFiltering.test.tsx`:

- ✅ Renders all orders by default
- ✅ Filters by search query
- ✅ Filters by side (buy/sell)
- ✅ Filters by chain pair
- ✅ Filters by asset
- ✅ Combines multiple filters
- ✅ Shows reset button when filters active
- ✅ Resets all filters correctly
- ✅ Updates URL params on filter change
- ✅ Reads filters from URL on mount
- ✅ Shows empty state appropriately

## Acceptance Criteria Status

✅ **Filters can be combined** - All filters work together seamlessly

✅ **URL query params reflect current filters** - Full bidirectional sync implemented

✅ **Reset filters returns full list** - Reset button clears all filters and shows all orders

## Files Modified

1. `frontend/src/components/marketplace/OrderBookList.tsx`
   - Added URL synchronization with `useRouter`, `usePathname`, `useSearchParams`
   - Implemented bidirectional filter state sync
   - Added reset functionality
   - Added conditional reset button rendering

2. `frontend/src/__tests__/orderFiltering.test.tsx` (new)
   - Comprehensive test coverage for all filtering scenarios

## Future Enhancements

Potential improvements for future iterations:

- Save filter presets (similar to orders page)
- Advanced filter drawer for mobile
- Filter by price range
- Filter by expiration time
- Sort persistence in URL
- Filter analytics/tracking
