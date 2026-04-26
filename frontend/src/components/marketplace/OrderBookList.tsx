"use client";

import { useMemo, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Order, OrderSide, OrderStatus } from "@/types";
import { Badge, Button, Modal } from "@/components/ui";
import { Search, Zap, X } from "lucide-react";
import { clsx } from "clsx";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";
import { OrderListTable, OrderSortKey } from "@/components/marketplace/OrderListTable";

interface OrderBookListProps {
  orders: Order[];
  onTakeOrder: (order: Order) => void;
}

interface OrderTakeModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (order: Order) => void;
}

export function OrderTakeModal({ order, isOpen, onClose, onConfirm }: OrderTakeModalProps) {
  const { activeAddress: address } = useUnifiedWallet();

  if (!order) return null;

  const isBuy = order.side === OrderSide.BUY;

  return (
    <Modal open={isOpen} onClose={onClose} title="Execute Swap Order">
      <div className="space-y-4">
        <p className="text-text-secondary">
          You are about to {isBuy ? "buy" : "sell"}{" "}
          <span className="font-bold text-text-primary">
            {order.amount} {order.tokenIn}
          </span>{" "}
          for{" "}
          <span className="font-bold text-text-primary">
            {order.total} {order.tokenOut}
          </span>
          .
        </p>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-text-muted">Pair:</div>
          <div className="text-right font-mono text-text-primary">{order.pair}</div>

          <div className="text-text-muted">Side:</div>
          <div className={clsx("text-right font-bold", isBuy ? "text-success" : "text-error")}>
            {order.side.toUpperCase()}
          </div>

          <div className="text-text-muted">Amount:</div>
          <div className="text-right font-mono text-text-primary">
            {order.amount} {order.tokenIn}
          </div>

          <div className="text-text-muted">Price:</div>
          <div className="text-right font-mono text-text-primary">
            {order.price} {order.tokenOut}/{order.tokenIn}
          </div>

          <div className="text-text-muted">Total:</div>
          <div className="text-right font-mono text-text-primary">
            {order.total} {order.tokenOut}
          </div>

          <div className="text-text-muted">Maker:</div>
          <div className="text-right font-mono text-text-primary truncate">{order.maker}</div>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onConfirm(order)} disabled={!address}>
            {address ? "Confirm Swap" : "Connect Wallet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function OrderBookList({ orders, onTakeOrder }: OrderBookListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const [sideFilter, setSideFilter] = useState<OrderSide | "all">(
    () => (searchParams.get("side") as OrderSide | "all") ?? "all"
  );
  const [chainPairFilter, setChainPairFilter] = useState(() => searchParams.get("chain") ?? "all");
  const [assetFilter, setAssetFilter] = useState(() => searchParams.get("asset") ?? "all");
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: OrderSortKey;
    direction: "asc" | "desc";
  }>({ key: "timestamp", direction: "desc" });

  const chainPairOptions = useMemo(() => {
    return Array.from(new Set(orders.map((order) => `${order.chainIn} → ${order.chainOut}`))).sort();
  }, [orders]);

  const assetOptions = useMemo(() => {
    return Array.from(new Set(orders.flatMap((order) => [order.tokenIn, order.tokenOut]))).sort();
  }, [orders]);

  // Sync URL params with filter state
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());

    const updateParam = (key: string, value: string, defaultValue: string) => {
      if (!value || value === defaultValue) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    };

    updateParam("search", search.trim(), "");
    updateParam("side", sideFilter, "all");
    updateParam("chain", chainPairFilter, "all");
    updateParam("asset", assetFilter, "all");

    const currentUrl = `${pathname}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;
    const targetUrl = `${pathname}${params.toString() ? `?${params.toString()}` : ""}`;

    if (currentUrl !== targetUrl) {
      router.replace(targetUrl, { scroll: false });
    }
  }, [search, sideFilter, chainPairFilter, assetFilter, pathname, router, searchParams]);

  // Sync filter state with URL params on mount and URL changes
  useEffect(() => {
    setSearch(searchParams.get("search") ?? "");
    setSideFilter((searchParams.get("side") as OrderSide | "all") ?? "all");
    setChainPairFilter(searchParams.get("chain") ?? "all");
    setAssetFilter(searchParams.get("asset") ?? "all");
  }, [searchParams]);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const notExpired = !o.expiresAt || new Date(o.expiresAt).getTime() > Date.now();
        const matchesSearch =
          o.pair.toLowerCase().includes(search.toLowerCase()) ||
          o.maker.toLowerCase().includes(search.toLowerCase()) ||
          o.tokenIn.toLowerCase().includes(search.toLowerCase()) ||
          o.tokenOut.toLowerCase().includes(search.toLowerCase());
        const matchesSide = sideFilter === "all" || o.side === sideFilter;
        const matchesChainPair =
          chainPairFilter === "all" || `${o.chainIn} → ${o.chainOut}` === chainPairFilter;
        const matchesAsset =
          assetFilter === "all" || o.tokenIn === assetFilter || o.tokenOut === assetFilter;
        return (
          matchesSearch &&
          matchesSide &&
          matchesChainPair &&
          matchesAsset &&
          o.status === OrderStatus.OPEN &&
          notExpired
        );
      });
  }, [assetFilter, chainPairFilter, orders, search, sideFilter]);

  const handleSort = (key: OrderSortKey) => {
    setSortConfig((current) => {
      if (current.key !== key) return { key, direction: "desc" };
      return { key, direction: current.direction === "desc" ? "asc" : "desc" };
    });
  };

  const resetFilters = () => {
    setSearch("");
    setSideFilter("all");
    setChainPairFilter("all");
    setAssetFilter("all");
  };

  const hasActiveFilters =
    search.trim() !== "" || sideFilter !== "all" || chainPairFilter !== "all" || assetFilter !== "all";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            className="w-full h-10 rounded-xl border border-border bg-surface-overlay pl-10 pr-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            placeholder="Search pair or address..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Button
            variant={sideFilter === "all" ? "primary" : "ghost"}
            size="sm"
            onClick={() => setSideFilter("all")}
          >
            All
          </Button>
          <Button
            variant={sideFilter === OrderSide.BUY ? "outline" : "ghost"}
            size="sm"
            onClick={() => setSideFilter(OrderSide.BUY)}
          >
            Buys
          </Button>
          <Button
            variant={sideFilter === OrderSide.SELL ? "danger" : "ghost"}
            size="sm"
            onClick={() => setSideFilter(OrderSide.SELL)}
          >
            Sells
          </Button>
          <select
            aria-label="Filter by chain route"
            value={chainPairFilter}
            onChange={(event) => setChainPairFilter(event.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-raised px-3 text-xs text-text-primary"
          >
            <option value="all">All routes</option>
            {chainPairOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <select
            aria-label="Filter by asset"
            value={assetFilter}
            onChange={(event) => setAssetFilter(event.target.value)}
            className="h-8 rounded-xl border border-border bg-surface-raised px-3 text-xs text-text-primary"
          >
            <option value="all">All assets</option>
            {assetOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              icon={<X size={14} />}
              className="text-text-muted hover:text-text-primary"
            >
              Reset
            </Button>
          )}
        </div>
      </div>

      <OrderListTable
        orders={filteredOrders}
        sortKey={sortConfig.key}
        sortDirection={sortConfig.direction}
        onSort={handleSort}
        onTakeOrder={onTakeOrder}
        onViewDetails={setDetailsOrder}
        onClearFilters={hasActiveFilters ? resetFilters : undefined}
        emptyTitle="No active orders matching filters."
        emptyDescription="Adjust filters or clear them to browse all open orders."
        pageSize={8}
      />

      <OrderDetailsModal
        order={detailsOrder}
        open={Boolean(detailsOrder)}
        onClose={() => setDetailsOrder(null)}
        onTakeOrder={(order) => {
          setDetailsOrder(null);
          onTakeOrder(order);
        }}
      />
    </div>
  );
}

function OrderDetailsModal({
  order,
  open,
  onClose,
  onTakeOrder,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onTakeOrder: (order: Order) => void;
}) {
  if (!order) return null;

  return (
    <Modal open={open} onClose={onClose} title="Order Details" size="lg">
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={order.side === OrderSide.BUY ? "success" : "error"}>
            {order.side.toUpperCase()}
          </Badge>
          <Badge variant="info">{order.orderType ?? "limit"}</Badge>
          <span className="text-sm text-text-secondary">
            Created{" "}
            {new Date(order.timestamp).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <DetailRow label="Pair" value={order.pair} />
          <DetailRow label="Maker" value={order.maker} />
          <DetailRow label="Route" value={`${order.chainIn} → ${order.chainOut}`} />
          <DetailRow label="Price" value={`${order.price} ${order.tokenOut}/${order.tokenIn}`} />
          <DetailRow label="Size" value={`${order.amount} ${order.tokenIn}`} />
          <DetailRow label="Total" value={`${order.total} ${order.tokenOut}`} />
          <DetailRow
            label="Expiry"
            value={
              order.expiresAt
                ? new Date(order.expiresAt).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })
                : "Not set"
            }
          />
          <DetailRow
            label="Partial Fills"
            value={order.allowPartialFills ? "Enabled" : "Disabled"}
          />
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button onClick={() => onTakeOrder(order)} icon={<Zap size={14} />}>
            Take Order
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 break-all text-sm text-text-primary">{value}</p>
    </div>
  );
}
