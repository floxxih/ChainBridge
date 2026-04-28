/**
 * Analytics event schema for ChainBridge key user flows.
 *
 * Rules:
 * - No PII (no wallet addresses, emails, names).
 * - Every event includes chain and action context.
 * - Event names follow the pattern: <domain>.<action>
 */

// ─── Chain identifier ────────────────────────────────────────────────────────

export type ChainId = "stellar" | "bitcoin" | "ethereum" | "solana" | "unknown";

// ─── Wallet events ───────────────────────────────────────────────────────────

export interface WalletConnectPayload {
  chain: ChainId;
  walletProvider: string; // e.g. "freighter", "metamask", "satsconnect"
}

export interface WalletDisconnectPayload {
  chain: ChainId;
  walletProvider: string;
  sessionDurationMs: number;
}

export interface WalletNetworkMismatchPayload {
  chain: ChainId;
  expectedNetwork: string;
  detectedNetwork: string;
}

// ─── Order events ────────────────────────────────────────────────────────────

export interface OrderCreatePayload {
  fromChain: ChainId;
  toChain: ChainId;
  fromAsset: string;
  toAsset: string;
}

export interface OrderCancelPayload {
  fromChain: ChainId;
  toChain: ChainId;
  reason: "user_action" | "expired" | "system";
}

export interface OrderFillPayload {
  fromChain: ChainId;
  toChain: ChainId;
  fromAsset: string;
  toAsset: string;
  partialFill: boolean;
}

export interface OrderViewPayload {
  fromChain: ChainId | "all";
  toChain: ChainId | "all";
  filterApplied: boolean;
}

// ─── Swap funnel events ──────────────────────────────────────────────────────

export interface SwapStartPayload {
  fromChain: ChainId;
  toChain: ChainId;
  fromAsset: string;
  toAsset: string;
}

export interface SwapQuoteViewedPayload {
  fromChain: ChainId;
  toChain: ChainId;
  slippagePct: number;
}

export interface SwapLockInitiatedPayload {
  fromChain: ChainId;
  toChain: ChainId;
  hashAlgorithm: "sha256" | "keccak256";
  timelockHours: number;
}

export interface SwapLockConfirmedPayload {
  chain: ChainId;
  confirmations: number;
}

export interface SwapClaimPayload {
  chain: ChainId;
  action: "claim" | "refund";
}

export interface SwapCompletedPayload {
  fromChain: ChainId;
  toChain: ChainId;
  durationMs: number;
}

export interface SwapExpiredPayload {
  fromChain: ChainId;
  toChain: ChainId;
  stage: "locked" | "partial" | "unstarted";
}

export interface SwapErrorPayload {
  fromChain: ChainId;
  toChain: ChainId;
  stage: string;
  errorCode: string;
}

// ─── Event registry ──────────────────────────────────────────────────────────

export interface AnalyticsEventMap {
  "wallet.connect": WalletConnectPayload;
  "wallet.disconnect": WalletDisconnectPayload;
  "wallet.network_mismatch": WalletNetworkMismatchPayload;
  "order.create": OrderCreatePayload;
  "order.cancel": OrderCancelPayload;
  "order.fill": OrderFillPayload;
  "order.view": OrderViewPayload;
  "swap.start": SwapStartPayload;
  "swap.quote_viewed": SwapQuoteViewedPayload;
  "swap.lock_initiated": SwapLockInitiatedPayload;
  "swap.lock_confirmed": SwapLockConfirmedPayload;
  "swap.claim": SwapClaimPayload;
  "swap.completed": SwapCompletedPayload;
  "swap.expired": SwapExpiredPayload;
  "swap.error": SwapErrorPayload;
}

export type AnalyticsEventName = keyof AnalyticsEventMap;

export interface AnalyticsEvent<K extends AnalyticsEventName = AnalyticsEventName> {
  name: K;
  payload: AnalyticsEventMap[K];
  timestamp: string;
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

const ENABLED = process.env.NEXT_PUBLIC_ANALYTICS_ENABLED !== "false";

export function track<K extends AnalyticsEventName>(name: K, payload: AnalyticsEventMap[K]): void {
  if (!ENABLED) return;

  const event: AnalyticsEvent<K> = {
    name,
    payload,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV !== "production") {
    console.debug("[analytics]", event.name, event.payload);
    return;
  }

  try {
    const url = process.env.NEXT_PUBLIC_ANALYTICS_URL;
    if (url) {
      navigator.sendBeacon(url, JSON.stringify(event));
    }
  } catch {
    // Never throw from analytics
  }
}
