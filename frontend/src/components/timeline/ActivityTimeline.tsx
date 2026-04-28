"use client";

import { Badge, TruncatedHash } from "@/components/ui";
import { clsx } from "clsx";
import { AlertCircle, CheckCircle2, Clock3, ExternalLink } from "lucide-react";

export type ActivityTimelineStatus = "pending" | "confirmed" | "failed";

export interface ActivityTimelineEvent {
  id: string;
  label: string;
  timestamp?: string | null;
  chain?: string;
  status: ActivityTimelineStatus;
  txHash?: string | null;
  href?: string;
  description?: string;
}

interface ActivityTimelineProps {
  title?: string;
  events: ActivityTimelineEvent[];
  emptyMessage?: string;
  className?: string;
}

function statusIcon(status: ActivityTimelineStatus) {
  switch (status) {
    case "confirmed":
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-red-400" />;
    default:
      return <Clock3 className="h-4 w-4 text-brand-500" />;
  }
}

function statusBadgeVariant(status: ActivityTimelineStatus) {
  if (status === "confirmed") return "success";
  if (status === "failed") return "error";
  return "info";
}

export function ActivityTimeline({
  title,
  events,
  emptyMessage = "No lifecycle events yet.",
  className,
}: ActivityTimelineProps) {
  return (
    <div className={clsx("space-y-3", className)}>
      {title && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{title}</p>
      )}

      {events.length === 0 ? (
        <div className="rounded-2xl border border-border bg-surface-raised p-4 text-sm text-text-secondary">
          {emptyMessage}
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, index) => (
            <div key={event.id} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    "mt-1 flex h-8 w-8 items-center justify-center rounded-full border bg-surface-raised",
                    event.status === "confirmed" && "border-emerald-500/20",
                    event.status === "pending" && "border-brand-500/20",
                    event.status === "failed" && "border-red-500/20"
                  )}
                >
                  {statusIcon(event.status)}
                </span>
                {index < events.length - 1 && <span className="mt-1 h-full w-px bg-border" />}
              </div>

              <div className="min-w-0 flex-1 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-text-primary">{event.label}</p>
                  <Badge variant={statusBadgeVariant(event.status)} className="capitalize">
                    {event.status}
                  </Badge>
                  {event.chain && (
                    <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                      {event.chain}
                    </span>
                  )}
                </div>

                <p className="mt-1 text-xs text-text-secondary">
                  {event.timestamp ? new Date(event.timestamp).toLocaleString() : "Awaiting event"}
                </p>

                {event.description && (
                  <p className="mt-2 text-sm text-text-secondary">{event.description}</p>
                )}

                {event.txHash && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-text-muted">
                    <span className="text-text-primary">
                      <TruncatedHash hash={event.txHash} label="tx hash" copiable={false} shortenOptions={{ prefixLength: 12, suffixLength: 8 }} />
                    </span>
                    {event.href && (
                      <a
                        href={event.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-text-primary underline underline-offset-4"
                      >
                        View tx
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
