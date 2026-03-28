"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, RefreshCw, Search, XCircle } from "lucide-react";

import { Button, Card, Input, ToastContainer } from "@/components/ui";
import {
  DEMO_ORDER_OWNER,
  useMockOrders,
  useOrderBookStore,
} from "@/hooks/useOrderBook";
import { useWalletStore } from "@/hooks/useWallet";
import { Order, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 4;

type FilterStatus = "all" | "active" | "expired" | "cancelled" | "filled";
type ToastMessage = {
  id: string;
  type: "success" | "error" | "info";
  title: string;
  message?: string;
};

function deriveStatus(order: Order): OrderStatus {
  if (order.status !== OrderStatus.OPEN) return order.status;
  if (order.expiresAt && new Date(order.expiresAt).getTime() < Date.now()) {
    return OrderStatus.EXPIRED;
  }
  return OrderStatus.OPEN;
}

function shortAddress(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

export default function OrdersPage() {
  const { address } = useWalletStore();
  const ownerAddress = address ?? DEMO_ORDER_OWNER;
  const { seedMockOrders } = useMockOrders();
  const orders = useOrderBookStore((state) => state.orders);
  const updateOrder = useOrderBookStore((state) => state.updateOrder);

  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [pendingCancelId, setPendingCancelId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    seedMockOrders(ownerAddress);
  }, [ownerAddress, seedMockOrders]);

  const myOrders = useMemo(() => {
    return orders
      .filter((order) => order.maker === ownerAddress)
      .map((order) => ({ ...order, derivedStatus: deriveStatus(order) }))
      .sort((left, right) => {
        return new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime();
      });
  }, [orders, ownerAddress]);

  const filtered = useMemo(() => {
    const lowered = query.toLowerCase().trim();
    return myOrders.filter((order) => {
      const matchesQuery =
        !lowered ||
        order.pair.toLowerCase().includes(lowered) ||
        order.tokenIn.toLowerCase().includes(lowered) ||
        order.tokenOut.toLowerCase().includes(lowered);

      if (!matchesQuery) return false;
      if (statusFilter === "all") return true;
      if (statusFilter === "active") return order.derivedStatus === OrderStatus.OPEN;
      if (statusFilter === "expired") return order.derivedStatus === OrderStatus.EXPIRED;
      if (statusFilter === "cancelled") return order.derivedStatus === OrderStatus.CANCELLED;
      return order.derivedStatus === OrderStatus.FILLED;
    });
  }, [myOrders, query, statusFilter]);

  useEffect(() => {
    setPage(1);
  }, [query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleOrders = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function pushToast(toast: Omit<ToastMessage, "id">) {
    setToasts((current) => [...current, { id: `${Date.now()}-${Math.random()}`, ...toast }]);
  }

  async function cancelOrder(order: Order) {
    setPendingCancelId(order.id);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      updateOrder(order.id, { status: OrderStatus.CANCELLED });
      pushToast({
        type: "success",
        title: "Order cancelled",
        message: `${order.pair} has been removed from the open book.`,
      });
    } catch {
      pushToast({
        type: "error",
        title: "Cancel failed",
        message: "The order could not be cancelled. Please try again.",
      });
    } finally {
      setPendingCancelId(null);
    }
  }

  const activeCount = myOrders.filter((order) => order.derivedStatus === OrderStatus.OPEN).length;
  const expiredCount = myOrders.filter((order) => order.derivedStatus === OrderStatus.EXPIRED).length;

  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            Order Management
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            My Orders
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
            Review active and expired orders, filter by status, and cancel outstanding liquidity
            with direct feedback.
          </p>
          {!address && (
            <p className="mt-3 text-sm text-text-muted">
              Showing the local demo portfolio until a wallet is connected.
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Active" value={String(activeCount)} />
          <StatCard label="Expired" value={String(expiredCount)} />
        </div>
      </div>

      <Card variant="raised" className="p-5">
        <div className="grid gap-3 md:grid-cols-[1.2fr_auto_auto]">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search pair or token"
            leftElement={<Search className="h-4 w-4" />}
          />
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as FilterStatus)}
            className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
            <option value="filled">Filled</option>
          </select>
          <Link href="/marketplace">
            <Button variant="secondary" className="w-full">
              Browse Market
            </Button>
          </Link>
        </div>
      </Card>

      <div className="mt-6 space-y-4">
        {visibleOrders.length === 0 ? (
          <Card variant="raised" className="p-10 text-center text-text-secondary">
            No orders match the current filters.
          </Card>
        ) : (
          visibleOrders.map((order) => (
            <Card key={order.id} variant="glass" className="p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xl font-bold text-text-primary">{order.pair}</span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em]",
                        order.derivedStatus === OrderStatus.OPEN &&
                          "bg-emerald-500/10 text-emerald-400",
                        order.derivedStatus === OrderStatus.EXPIRED &&
                          "bg-amber-500/10 text-amber-400",
                        order.derivedStatus === OrderStatus.CANCELLED &&
                          "bg-red-500/10 text-red-300",
                        order.derivedStatus === OrderStatus.FILLED &&
                          "bg-brand-500/10 text-brand-400"
                      )}
                    >
                      {order.derivedStatus}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                    <p>Maker: {shortAddress(order.maker)}</p>
                    <p>
                      Chain Route: {order.chainIn} to {order.chainOut}
                    </p>
                    <p>
                      Size: {order.amount} {order.tokenIn}
                    </p>
                    <p>
                      Total: {order.total} {order.tokenOut}
                    </p>
                    <p>
                      Expires:{" "}
                      {order.expiresAt ? new Date(order.expiresAt).toLocaleString() : "Not set"}
                    </p>
                    <p>
                      Created: {new Date(order.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="min-w-[220px] space-y-3">
                  <div className="rounded-2xl border border-border bg-surface-raised p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Order Summary
                    </p>
                    <p className="mt-3 text-sm text-text-secondary">
                      Type: <span className="text-text-primary">{order.orderType ?? "limit"}</span>
                    </p>
                    <p className="mt-2 text-sm text-text-secondary">
                      Partial fills:{" "}
                      <span className="text-text-primary">
                        {order.allowPartialFills ? "Enabled" : "Disabled"}
                      </span>
                    </p>
                  </div>

                  <Button
                    variant="danger"
                    className="w-full"
                    icon={<XCircle className="h-4 w-4" />}
                    loading={pendingCancelId === order.id}
                    disabled={order.derivedStatus !== OrderStatus.OPEN}
                    onClick={() => void cancelOrder(order)}
                  >
                    Cancel Order
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      <div className="mt-6 flex items-center justify-between rounded-2xl border border-border bg-surface-overlay/30 p-4">
        <div className="flex items-center gap-3 text-sm text-text-secondary">
          <Clock3 className="h-4 w-4 text-brand-500" />
          <span>
            Page {page} of {totalPages}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            icon={<RefreshCw className="h-4 w-4" />}
          >
            Next
          </Button>
        </div>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }}
      />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-overlay/40 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-3xl font-black text-text-primary">{value}</p>
    </div>
  );
}
