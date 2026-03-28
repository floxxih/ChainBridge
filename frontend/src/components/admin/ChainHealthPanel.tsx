"use client";

import { cn } from "@/lib/utils";
import type { ChainHealth as ChainHealthType } from "@/lib/adminApi";
import { Activity, CheckCircle2, AlertTriangle, XCircle, HelpCircle } from "lucide-react";

interface ChainHealthProps {
  chains: ChainHealthType[];
  className?: string;
}

const healthMeta: Record<
  string,
  { icon: typeof CheckCircle2; color: string; bg: string; label: string }
> = {
  healthy: {
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    label: "Healthy",
  },
  degraded: {
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    label: "Degraded",
  },
  unhealthy: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10", label: "Unhealthy" },
  unknown: { icon: HelpCircle, color: "text-gray-400", bg: "bg-gray-500/10", label: "Unknown" },
};

const chainColor: Record<string, string> = {
  stellar: "border-brand-500/30",
  ethereum: "border-indigo-500/30",
  bitcoin: "border-orange-500/30",
};

export function ChainHealthPanel({ chains, className }: ChainHealthProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-text-muted" />
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          Chain Health
        </h3>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {chains.map((c) => {
          const meta = healthMeta[c.health] ?? healthMeta.unknown;
          const HIcon = meta.icon;

          return (
            <div
              key={c.chain}
              className={cn(
                "rounded-xl border bg-surface-raised p-4 flex flex-col gap-3",
                chainColor[c.chain] ?? "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-text-primary capitalize">{c.chain}</span>
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    meta.bg,
                    meta.color
                  )}
                >
                  <HIcon className="h-3 w-3" />
                  {meta.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>Running</span>
                <span className="text-right font-medium text-text-primary">
                  {c.is_running ? "Yes" : "No"}
                </span>

                <span>Latest block</span>
                <span className="text-right font-mono text-text-secondary">
                  {c.latest_block?.toLocaleString() ?? "—"}
                </span>

                <span>Last synced</span>
                <span className="text-right font-mono text-text-secondary">
                  {c.last_synced_block?.toLocaleString() ?? "—"}
                </span>

                <span>Behind</span>
                <span
                  className={cn(
                    "text-right font-medium",
                    (c.blocks_behind ?? 0) > 50
                      ? "text-red-400"
                      : (c.blocks_behind ?? 0) > 10
                        ? "text-amber-400"
                        : "text-emerald-400"
                  )}
                >
                  {c.blocks_behind?.toLocaleString() ?? "—"}
                </span>
              </div>

              {c.last_updated && (
                <p className="text-[10px] text-text-muted">
                  Updated {new Date(c.last_updated).toLocaleString()}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
