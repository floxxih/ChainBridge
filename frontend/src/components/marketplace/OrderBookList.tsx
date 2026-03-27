"use client";

import { useMemo, useState } from "react";
import { Order, OrderSide, OrderStatus } from "@/types";
import { Badge, Button, Spinner, Modal } from "@/components/ui";
import { ArrowUpDown, Filter, Search, Zap, Trash2, ExternalLink } from "lucide-react";
import { clsx } from "clsx";
import { useWalletStore } from "@/hooks/useWallet";

interface OrderBookListProps {
  orders: Order[];
  onTakeOrder: (order: Order) => void;
  userAddress?: string;
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

export function OrderBookList({ orders, onTakeOrder, userAddress }: OrderBookListProps) {
  const [search, setSearch] = useState("");
  const [sideFilter, setSideFilter] = useState<OrderSide | "all">("all");
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Order;
    direction: "asc" | "desc";
  } | null>(null);

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const matchesSearch =
          o.pair.toLowerCase().includes(search.toLowerCase()) ||
          o.maker.toLowerCase().includes(search.toLowerCase());
        const matchesSide = sideFilter === "all" || o.side === sideFilter;
        return matchesSearch && matchesSide && o.status === OrderStatus.OPEN;
      })
      .sort((a, b) => {
        if (!sortConfig) return 0;
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === "string" && typeof bValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return 0;
      });
  }, [orders, search, sideFilter, sortConfig]);

  const handleSort = (key: keyof Order) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
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

        <div className="flex items-center gap-2">
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
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-background/50 overflow-hidden backdrop-blur-sm shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-overlay/50 border-b border-border">
                <th
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort("pair")}
                >
                  <div className="flex items-center gap-2">
                    Pair <ArrowUpDown size={12} />
                  </div>
                </th>
                <th
                  className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary"
                  onClick={() => handleSort("side")}
                >
                  <div className="flex items-center gap-2">
                    Side <ArrowUpDown size={12} />
                  </div>
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
                    <td className="px-6 py-4 whitespace-nowrap font-mono text-sm font-bold text-text-primary">
                      {order.total} {order.tokenOut}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Button
                        variant="primary"
                        size="sm"
                        className="shadow-glow-sm hover:shadow-glow-md"
                        onClick={() => onTakeOrder(order)}
                        icon={<Zap size={14} />}
                      >
                        Take
                      </Button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
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
    </div>
  );
}
