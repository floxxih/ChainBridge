"use client";

import { useMemo, useState } from "react";
import { Order, OrderSide, OrderStatus } from "@/types";
import { Badge, Button, Modal } from "@/components/ui";
import { ArrowUpDown, Filter, Search, Zap, Eye } from "lucide-react";
import { clsx } from "clsx";
import { useWalletStore } from "@/hooks/useWallet";

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
  const { address } = useWalletStore();

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
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<OrderSide | "all">("all");
  const [chainPairFilter, setChainPairFilter] = useState("all");
  const [assetFilter, setAssetFilter] = useState("all");
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: "price" | "amount" | "timestamp";
    direction: "asc" | "desc";
  }>({ key: "timestamp", direction: "desc" });

  const chainPairOptions = useMemo(() => {
    return Array.from(new Set(orders.map((order) => `${order.chainIn} → ${order.chainOut}`))).sort();
  }, [orders]);

  const assetOptions = useMemo(() => {
    return Array.from(new Set(orders.flatMap((order) => [order.tokenIn, order.tokenOut]))).sort();
  }, [orders]);

  function parseNumericValue(value: string) {
    return Number(value.replace(/,/g, "")) || 0;
  }

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
      })
      .sort((a, b) => {
        const direction = sortConfig.direction === "asc" ? 1 : -1;

        if (sortConfig.key === "timestamp") {
          return (
            (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * direction
          );
        }

        if (sortConfig.key === "price") {
          return (parseNumericValue(a.price) - parseNumericValue(b.price)) * direction;
        }

        return (parseNumericValue(a.amount) - parseNumericValue(b.amount)) * direction;
      });
  }, [assetFilter, chainPairFilter, orders, search, sideFilter, sortConfig]);

  const handleSort = (key: "price" | "amount" | "timestamp") => {
    let direction: "asc" | "desc" = "desc";
    if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = "asc";
    } else if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

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
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/50 overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-overlay/50 border-b border-border">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Pair
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Side
                </th>
                <th
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort("amount")}
                >
                  <div className="flex items-center gap-2">
                    Amount <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort("price")}
                >
                  <div className="flex items-center gap-2">
                    Price <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort("timestamp")}
                >
                  <div className="flex items-center gap-2">
                    Created <ArrowUpDown size={12} />
                  </div>
                </th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                  Total
                </th>
                <th className="px-4 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className="group hover:bg-surface-overlay/30 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="font-bold text-text-primary">{order.pair}</span>
                        <span className="text-[10px] text-text-muted uppercase tracking-tighter">
                          {order.chainIn} ↔ {order.chainOut}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={order.side === OrderSide.BUY ? "success" : "error"}>
                        {order.side.toUpperCase()}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-text-primary">
                      {order.amount} {order.tokenIn}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm text-text-secondary">
                      {order.price}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-text-secondary">
                      {new Date(order.timestamp).toLocaleString([], {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-text-primary">
                      {order.total} {order.tokenOut}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDetailsOrder(order)}
                          icon={<Eye size={14} />}
                        >
                          Details
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          className="shadow-glow-sm hover:shadow-glow-md"
                          onClick={() => onTakeOrder(order)}
                          icon={<Zap size={14} />}
                        >
                          Take
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-surface-overlay flex items-center justify-center border border-border">
                        <Filter className="text-text-muted" />
                      </div>
                      <p className="text-text-secondary font-medium">
                        No active orders matching filters.
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSearch("");
                          setSideFilter("all");
                          setChainPairFilter("all");
                          setAssetFilter("all");
                        }}
                      >
                        Clear Filters
                      </Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

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
