"use client";

import { Order } from "@/types";
import { Button, StatusBadge, TruncatedHash } from "@/components/ui";
import { formatAmount, formatRelativeTime } from "@/lib/utils";
import { ArrowRight, Clock, Shield } from "lucide-react";

interface OrderCardProps {
  order: Order;
  onTakeOrder: (order: Order) => void;
  onViewDetails: (order: Order) => void;
  takeButtonDisabled?: boolean;
}

export function OrderCard({
  order,
  onTakeOrder,
  onViewDetails,
  takeButtonDisabled = false,
}: OrderCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-sm transition-all hover:border-brand-500/30 hover:shadow-md">
      {/* Header: Pair & Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-lg font-bold text-text-primary">{order.pair}</span>
            <div className="flex items-center gap-1 text-[10px] uppercase tracking-tighter text-text-muted">
              <span>{order.chainIn}</span>
              <ArrowRight size={10} className="text-brand-500" />
              <span>{order.chainOut}</span>
            </div>
          </div>
        </div>
        <StatusBadge orderStatus={order.status} size="sm" />
      </div>

      {/* Middle: Amount & Price */}
      <div className="grid grid-cols-2 gap-4 rounded-xl bg-surface-overlay/50 p-3">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            You Send
          </span>
          <span className="font-mono text-sm font-bold text-text-primary">
            {formatAmount(order.amount)} {order.tokenIn}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">
            You Receive
          </span>
          <span className="font-mono text-sm font-bold text-brand-500">
            {formatAmount(order.total)} {order.tokenOut}
          </span>
        </div>
      </div>

      {/* Footer: Metadata & Actions */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Clock size={12} className="text-text-muted" />
            <span>{formatRelativeTime(order.timestamp)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Shield size={12} className="text-text-muted" />
            <TruncatedHash hash={order.maker} label="maker address" className="truncate max-w-[120px] opacity-80" />
          </div>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => onViewDetails(order)}>
            Details
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onTakeOrder(order)}
            disabled={takeButtonDisabled}
            className="px-5 shadow-glow-sm"
          >
            Take
          </Button>
        </div>
      </div>
    </div>
  );
}
