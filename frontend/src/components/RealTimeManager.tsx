"use client";

import { useEffect } from "react";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuth } from "@/hooks/useAuth";
import { useOrderBookStore } from "@/hooks/useOrderBook";
import { useTransactionStore } from "@/hooks/useTransactions";
import config from "@/lib/config";

export function RealTimeManager() {
  const { token } = useAuth();
  const { isConnected, subscribe } = useWebSocket(config.api.wsUrl, token);

  const { addOrder, updateOrder, removeOrder } = useOrderBookStore();
  const { addTransaction, updateTransaction } = useTransactionStore();

  // ── Order-book subscriptions ─────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe("orders", (data) => {
      if (!data?.id) return;
      const { event_type, data: payload } = data;
      const order = payload ?? data;

      if (event_type === "order.created") {
        addOrder(order);
      } else if (event_type === "order.matched" || event_type === "order.filled") {
        updateOrder(order.id, order);
      } else if (event_type === "order.cancelled") {
        removeOrder(order.id);
      } else {
        // Legacy / untyped messages
        if (order.status === "open") addOrder(order);
        else if (order.status === "cancelled") removeOrder(order.id);
        else updateOrder(order.id, order);
      }
    });

    return unsub;
  }, [isConnected, subscribe, addOrder, updateOrder, removeOrder]);

  // ── Swap status subscriptions ────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe("swaps", (data) => {
      if (!data) return;
      const { event_type, data: payload } = data;
      const swap = payload ?? data;
      if (!swap?.id) return;

      updateTransaction(swap.id, {
        status: swap.state ?? swap.status,
        ...(swap.other_chain_tx ? { hash: swap.other_chain_tx } : {}),
      });
    });

    return unsub;
  }, [isConnected, subscribe, updateTransaction]);

  // ── HTLC subscriptions ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isConnected) return;

    const unsub = subscribe("htlcs", (data) => {
      if (!data) return;
      const { event_type, data: payload } = data;
      const htlc = payload ?? data;
      if (!htlc?.id) return;

      if (event_type === "htlc.created") {
        addTransaction({
          id: htlc.id,
          hash: htlc.onchain_id ?? htlc.id,
          chain: "Stellar",
          type: "swap_lock",
          amount: String(htlc.amount),
          token: "XLM",
          status: htlc.status,
          confirmations: 0,
          requiredConfirmations: 1,
          timestamp: htlc.created_at ?? new Date().toISOString(),
        });
      } else {
        updateTransaction(htlc.id, { status: htlc.status });
      }
    });

    return unsub;
  }, [isConnected, subscribe, addTransaction, updateTransaction]);

  return null;
}
