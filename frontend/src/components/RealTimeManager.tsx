"use client";

import { useEffect, useMemo } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useOrderBookStore } from "@/hooks/useOrderBook";
import { useTransactionStore } from "@/hooks/useTransactions";
import { useSwapHistoryStore, type SwapHistoryItem } from "@/hooks/useSwapHistory";
import { queryClient, queryKeys } from "@/lib/queryClient";
import { useToast } from "@/hooks/useToast";
import { Order, OrderSide, OrderStatus, SwapStatus, TransactionStatus } from "@/types";
import { useSettingsStore, resolveWsUrlForMode } from "@/hooks/useSettings";
import config from "@/lib/config";

interface EventEnvelope {
  event_type?: string;
  data?: Record<string, unknown>;
}

function getString(value: unknown, fallback: string) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function mapOrderStatus(status: string): OrderStatus {
  const normalized = status.toLowerCase();
  if (normalized === "filled") return OrderStatus.FILLED;
  if (normalized === "cancelled") return OrderStatus.CANCELLED;
  if (normalized === "expired") return OrderStatus.EXPIRED;
  return OrderStatus.OPEN;
}

function mapSwapStatus(status: string): SwapStatus {
  const normalized = status.toLowerCase();
  if (normalized === SwapStatus.COMPLETED) return SwapStatus.COMPLETED;
  if (normalized === SwapStatus.CANCELLED) return SwapStatus.CANCELLED;
  if (normalized === SwapStatus.EXPIRED) return SwapStatus.EXPIRED;
  if (normalized === SwapStatus.LOCKED_INITIATOR) return SwapStatus.LOCKED_INITIATOR;
  if (normalized === SwapStatus.LOCKED_RESPONDER) return SwapStatus.LOCKED_RESPONDER;
  return SwapStatus.PENDING;
}

function mapTransactionStatus(status: string): TransactionStatus {
  const normalized = status.toLowerCase();
  if (normalized === TransactionStatus.COMPLETED) return TransactionStatus.COMPLETED;
  if (normalized === TransactionStatus.FAILED) return TransactionStatus.FAILED;
  if (normalized === TransactionStatus.CONFIRMING) return TransactionStatus.CONFIRMING;
  return TransactionStatus.PENDING;
}

function unwrapEvent(payload: unknown): { eventType?: string; data: Record<string, unknown> } {
  if (payload && typeof payload === "object") {
    const maybeEnvelope = payload as EventEnvelope;
    if (maybeEnvelope.data && typeof maybeEnvelope.data === "object") {
      return {
        eventType: maybeEnvelope.event_type,
        data: maybeEnvelope.data,
      };
    }

    return {
      data: payload as Record<string, unknown>,
    };
  }

  return { data: {} };
}

function upsertById<T extends { id: string }>(items: T[], item: T): T[] {
  const index = items.findIndex((entry) => entry.id === item.id);
  if (index === -1) {
    return [item, ...items];
  }

  const next = [...items];
  next[index] = { ...next[index], ...item };
  return next;
}

function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  return items.filter((item) => item.id !== id);
}

function normalizeOrder(raw: Record<string, unknown>): Order | null {
  const id = getString(raw.id, "");
  if (!id) return null;

  const tokenIn = getString(raw.tokenIn ?? raw.from_asset, "XLM");
  const tokenOut = getString(raw.tokenOut ?? raw.to_asset, "ETH");
  const statusValue = getString(raw.status, "open");

  const timestamp =
    getString(raw.timestamp ?? raw.created_at, "") ||
    getString(raw.updated_at, "") ||
    new Date().toISOString();

  const expiryValue = raw.expiresAt ?? raw.expiry;
  const expiresAt =
    typeof expiryValue === "number"
      ? new Date(expiryValue * 1000).toISOString()
      : typeof expiryValue === "string"
        ? expiryValue
        : undefined;

  const fromAmount = getString(raw.amount ?? raw.from_amount, "0");
  const toAmount = getString(raw.total ?? raw.to_amount, "0");

  return {
    id,
    maker: getString(raw.maker ?? raw.creator, "unknown"),
    pair: getString(raw.pair, `${tokenIn}/${tokenOut}`),
    side:
      typeof raw.side === "string" && raw.side.toLowerCase() === OrderSide.BUY
        ? OrderSide.BUY
        : OrderSide.SELL,
    amount: fromAmount,
    price: getString(raw.price, "0"),
    total: toAmount,
    tokenIn,
    tokenOut,
    chainIn: getString(raw.chainIn ?? raw.from_chain, "Stellar"),
    chainOut: getString(raw.chainOut ?? raw.to_chain, "Ethereum"),
    status: mapOrderStatus(statusValue),
    timestamp,
    expiresAt,
  };
}

function normalizeSwap(raw: Record<string, unknown>): SwapHistoryItem | null {
  const id = getString(raw.id, "");
  if (!id) return null;

  const from = getString(raw.from ?? raw.inputAsset ?? raw.from_asset, "XLM");
  const to = getString(raw.to ?? raw.outputAsset ?? raw.to_asset, "ETH");

  return {
    id,
    from,
    to,
    amount: getString(raw.amount ?? raw.inputAmount ?? raw.from_amount, "0"),
    toAmount: getString(raw.toAmount ?? raw.outputAmount ?? raw.to_amount, "0"),
    status: mapSwapStatus(getString(raw.status ?? raw.state, "pending")),
    date: getString(raw.date ?? raw.created_at, new Date().toISOString()),
    otherChainTx: getString(raw.other_chain_tx, "") || undefined,
  };
}

function getItemId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const id = (value as { id?: unknown }).id;
  if (typeof id === "string" && id.trim()) return id;
  if (typeof id === "number") return String(id);
  return null;
}

export function RealTimeManager() {
  const { token } = useAuth();
  const { info, success } = useToast();

  const settings = useSettingsStore((state) => state.settings);
  const wsUrl = useMemo(
    () => resolveWsUrlForMode(config.api.wsUrl, settings.network.mode),
    [settings.network.mode]
  );

  const { isConnected, subscribe } = useWebSocket(wsUrl, token, {
    enabled: settings.network.liveUpdates,
  });

  const { addOrder, updateOrder, removeOrder } = useOrderBookStore();
  const { addTransaction, updateTransaction } = useTransactionStore();
  const { upsertSwap } = useSwapHistoryStore();

  const showRealtimeToast = settings.notifications.realtimeToasts;

  // Orders channel
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe("orders", (payload) => {
      const { eventType, data } = unwrapEvent(payload);
      const normalized = normalizeOrder(data);
      if (!normalized) return;

      if (eventType === "order.cancelled") {
        removeOrder(normalized.id);
      } else if (eventType === "order.created") {
        addOrder(normalized);
      } else {
        updateOrder(normalized.id, normalized);
      }

      queryClient.setQueriesData({ queryKey: queryKeys.orders.all }, (current) => {
        if (!Array.isArray(current)) return current;

        const typed = current.filter((entry): entry is { id: string } => Boolean(getItemId(entry)));
        if (eventType === "order.cancelled") {
          return removeById(typed, normalized.id);
        }

        return upsertById(typed, {
          ...typed.find((entry) => entry.id === normalized.id),
          ...data,
          id: normalized.id,
        });
      });

      if (!showRealtimeToast) return;

      if (eventType === "order.created") {
        info("New order", `${normalized.pair} is now available.`);
      }
      if (eventType === "order.filled") {
        success("Order filled", `${normalized.pair} has completed.`);
      }
      if (eventType === "order.cancelled") {
        info("Order cancelled", `${normalized.pair} was removed.`);
      }
    });

    return unsubscribe;
  }, [
    addOrder,
    info,
    isConnected,
    removeOrder,
    showRealtimeToast,
    subscribe,
    success,
    updateOrder,
  ]);

  // Swaps channel
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe("swaps", (payload) => {
      const { eventType, data } = unwrapEvent(payload);
      const normalized = normalizeSwap(data);
      if (!normalized) return;

      upsertSwap(normalized);

      queryClient.setQueriesData({ queryKey: queryKeys.swaps.all }, (current) => {
        if (!Array.isArray(current)) return current;

        const typed = current.filter((entry): entry is { id: string } => Boolean(getItemId(entry)));
        return upsertById(typed, {
          ...typed.find((entry) => entry.id === normalized.id),
          ...data,
          id: normalized.id,
        });
      });

      updateTransaction(normalized.id, {
        status: mapTransactionStatus(getString(data.state ?? data.status, "pending")),
        ...(typeof data.other_chain_tx === "string" ? { hash: data.other_chain_tx } : {}),
      });

      if (!showRealtimeToast) return;
      if (eventType === "swap.completed") {
        success("Swap completed", `${normalized.from} to ${normalized.to} settled.`);
      }
      if (eventType === "swap.failed") {
        info("Swap update", `${normalized.id} changed status to ${normalized.status}.`);
      }
    });

    return unsubscribe;
  }, [isConnected, showRealtimeToast, subscribe, success, info, updateTransaction, upsertSwap]);

  // HTLC channel
  useEffect(() => {
    if (!isConnected) return;

    const unsubscribe = subscribe("htlcs", (payload) => {
      const { eventType, data } = unwrapEvent(payload);
      const htlcId = getString(data.id, "");
      if (!htlcId) return;

      queryClient.setQueriesData({ queryKey: queryKeys.htlcs.all }, (current) => {
        if (!Array.isArray(current)) return current;

        const typed = current.filter((entry): entry is { id: string } => Boolean(getItemId(entry)));
        return upsertById(typed, {
          ...typed.find((entry) => entry.id === htlcId),
          ...data,
          id: htlcId,
        });
      });

      if (eventType === "htlc.created") {
        addTransaction({
          id: htlcId,
          hash: getString(data.onchain_id, htlcId),
          chain: "Stellar",
          type: "swap_lock",
          amount: getString(data.amount, "0"),
          token: "XLM",
          status: mapTransactionStatus(getString(data.status, "pending")),
          confirmations: 0,
          requiredConfirmations: 1,
          timestamp: getString(data.created_at, new Date().toISOString()),
        });
      } else {
        updateTransaction(htlcId, {
          status: mapTransactionStatus(getString(data.status, "pending")),
        });
      }

      if (!showRealtimeToast) return;
      if (eventType === "htlc.claimed") {
        success("HTLC claimed", `${htlcId} has been claimed.`);
      }
      if (eventType === "htlc.refunded") {
        info("HTLC refunded", `${htlcId} refund completed.`);
      }
    });

    return unsubscribe;
  }, [addTransaction, info, isConnected, showRealtimeToast, subscribe, success, updateTransaction]);

  return null;
}
