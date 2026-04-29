"use client";

import React, { useState } from "react";
import { ArrowUpDown, Eye, Zap } from "lucide-react";
import { Badge, Button, Modal } from "@/components/ui";
import { Order, OrderSide, OrderStatus } from "@/types";
import { cn } from "@/lib/utils";

interface OrderTableProps {
  orders: Order[];
  onTakeOrder: (order: Order) => void;
  sortKey: "price" | "amount" | "timestamp";
  sortDirection: "asc" | "desc";
  onSort: (key: "price" | "amount" | "timestamp") => void;
}

export function OrderTable({
  orders,
  onTakeOrder,
  sortKey,
  sortDirection,
  onSort,
}: OrderTableProps) {
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);

  if (orders.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-background/50 p-20 text-center backdrop-blur-sm shadow-xl">
        <p className="text-text-secondary font-medium">No orders found matching your criteria.</p>
      </div>
    );
  }

  return (
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
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                onClick={() => onSort("amount")}
              >
                <div className="flex items-center gap-2">
                  Amount{" "}
                  <ArrowUpDown
                    size={12}
                    className={cn(sortKey === "amount" ? "text-brand-500" : "text-text-muted")}
                  />
                </div>
              </th>
              <th
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                onClick={() => onSort("price")}
              >
                <div className="flex items-center gap-2">
                  Price{" "}
                  <ArrowUpDown
                    size={12}
                    className={cn(sortKey === "price" ? "text-brand-500" : "text-text-muted")}
                  />
                </div>
              </th>
              <th
                className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted cursor-pointer hover:text-text-primary transition-colors"
                onClick={() => onSort("timestamp")}
              >
                <div className="flex items-center gap-2">
                  Created{" "}
                  <ArrowUpDown
                    size={12}
                    className={cn(sortKey === "timestamp" ? "text-brand-500" : "text-text-muted")}
                  />
                </div>
              </th>
              <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-text-muted">
                Total
              </th>
              <th className="px-4 py-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {orders.map((order) => (
              <tr key={order.id} className="group hover:bg-surface-overlay/30 transition-colors">
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
                      disabled={order.status !== OrderStatus.OPEN}
                    >
                      Take
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
          <Button
            onClick={() => onTakeOrder(order)}
            icon={<Zap size={14} />}
            disabled={order.status !== OrderStatus.OPEN}
          >
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
