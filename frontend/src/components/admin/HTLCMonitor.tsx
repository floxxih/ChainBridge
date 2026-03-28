"use client";

import { cn } from "@/lib/utils";
import type { ActiveHTLC } from "@/lib/adminApi";
import { Clock, AlertTriangle, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui";

interface HTLCMonitorProps {
  htlcs: ActiveHTLC[];
  activeCount: number;
  className?: string;
}

const urgencyStyles = {
  normal: "border-emerald-500/20",
  warning: "border-amber-500/30",
  critical: "border-red-500/30 bg-red-500/5",
};

const urgencyIcon = {
  normal: Clock,
  warning: AlertTriangle,
  critical: ShieldAlert,
};

function fmtTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400)
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d`;
}

export function HTLCMonitor({ htlcs, activeCount, className }: HTLCMonitorProps) {
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
          Active HTLCs
        </h3>
        <Badge variant="info">{activeCount} active</Badge>
      </div>

      {htlcs.length === 0 && (
        <p className="text-sm text-text-muted py-6 text-center">No active HTLCs</p>
      )}

      <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1 scrollbar-thin">
        {htlcs.map((h) => {
          const UrgIcon = urgencyIcon[h.urgency];
          return (
            <div
              key={h.id}
              className={cn(
                "rounded-xl border bg-surface-raised p-3 flex items-start gap-3 transition-colors",
                urgencyStyles[h.urgency]
              )}
            >
              <span
                className={cn(
                  "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                  h.urgency === "critical"
                    ? "bg-red-500/10 text-red-400"
                    : h.urgency === "warning"
                      ? "bg-amber-500/10 text-amber-400"
                      : "bg-emerald-500/10 text-emerald-400"
                )}
              >
                <UrgIcon className="h-3.5 w-3.5" />
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono text-text-secondary truncate">{h.id}</p>
                <div className="mt-1 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
                  <span>
                    Amount:{" "}
                    <strong className="text-text-primary">{h.amount.toLocaleString()}</strong>
                  </span>
                  <span>Algo: {h.hash_algorithm}</span>
                  <span>
                    Sender: <span className="font-mono">{h.sender.slice(0, 8)}…</span>
                  </span>
                  <span>
                    Receiver: <span className="font-mono">{h.receiver.slice(0, 8)}…</span>
                  </span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span
                  className={cn(
                    "text-xs font-bold",
                    h.urgency === "critical"
                      ? "text-red-400"
                      : h.urgency === "warning"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  )}
                >
                  {fmtTime(h.seconds_remaining)}
                </span>
                <p className="text-[10px] text-text-muted mt-0.5">remaining</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
