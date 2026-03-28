"use client";

import { cn } from "@/lib/utils";
import type { UserMetrics } from "@/lib/adminApi";
import { Users, ArrowRightLeft, TrendingUp } from "lucide-react";

interface UserActivityPanelProps {
  metrics: UserMetrics;
  className?: string;
}

export function UserActivityPanel({ metrics, className }: UserActivityPanelProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      {/* Top Traders */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Top Traders
          </h3>
        </div>
        <div className="flex flex-col gap-1">
          {metrics.top_traders.length === 0 && (
            <p className="text-sm text-text-muted py-4 text-center">No trading activity</p>
          )}
          {metrics.top_traders.slice(0, 10).map((trader, i) => (
            <div
              key={trader.creator}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-surface-overlay transition-colors"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface-overlay text-[10px] font-bold text-text-muted">
                {i + 1}
              </span>
              <span className="flex-1 truncate text-xs font-mono text-text-secondary">
                {trader.creator}
              </span>
              <span className="text-xs text-text-muted">{trader.order_count} orders</span>
              <span className="text-xs font-medium text-text-primary">
                {trader.total_volume.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Chain Pairs */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <ArrowRightLeft className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Trading Routes
          </h3>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {metrics.chain_pairs.map((pair) => (
            <div
              key={`${pair.from_chain}-${pair.to_chain}`}
              className="rounded-xl border border-border bg-surface-raised p-3 flex items-center gap-3"
            >
              <span className="text-xs font-bold text-text-primary capitalize">
                {pair.from_chain}
              </span>
              <ArrowRightLeft className="h-3 w-3 text-text-muted" />
              <span className="text-xs font-bold text-text-primary capitalize">
                {pair.to_chain}
              </span>
              <span className="ml-auto text-xs text-text-muted">{pair.count} trades</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Activity */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            7-Day Activity
          </h3>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {metrics.daily_activity.map((d) => {
            const dayLabel = new Date(d.day).toLocaleDateString([], { weekday: "short" });
            return (
              <div
                key={d.day}
                className="flex flex-col items-center gap-1 rounded-xl border border-border bg-surface-raised p-2"
              >
                <p className="text-[10px] text-text-muted">{dayLabel}</p>
                <p className="text-sm font-bold text-text-primary">{d.new_orders}</p>
                <p className="text-[10px] text-text-muted">{d.unique_users} users</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
