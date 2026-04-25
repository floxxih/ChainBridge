"use client";

import { clsx } from "clsx";
import { Check, CircleDot, Clock3, RotateCcw, X } from "lucide-react";

export type SwapTimelineState = "completed" | "current" | "upcoming";
export type SwapTimelineFlow = "success" | "refund";

export interface SwapTimelineStep {
  key: string;
  label: string;
  description?: string;
  state: SwapTimelineState;
  timestamp?: string | number | Date | null;
  chain?: string;
}

interface SwapProgressTimelineProps {
  steps: SwapTimelineStep[];
  flow?: SwapTimelineFlow;
  className?: string;
  ariaLabel?: string;
}

function formatTimestamp(value: SwapTimelineStep["timestamp"]): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString();
}

function StepIcon({ state, flow }: { state: SwapTimelineState; flow: SwapTimelineFlow }) {
  if (state === "completed") {
    if (flow === "refund") {
      return <RotateCcw className="h-4 w-4 text-amber-500" aria-hidden="true" />;
    }
    return <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />;
  }
  if (state === "current") {
    return <CircleDot className="h-4 w-4 text-brand-500" aria-hidden="true" />;
  }
  return <Clock3 className="h-4 w-4 text-text-muted" aria-hidden="true" />;
}

function ringClasses(state: SwapTimelineState, flow: SwapTimelineFlow): string {
  if (state === "completed") {
    return flow === "refund" ? "border-amber-500/30 bg-amber-500/5" : "border-emerald-500/30 bg-emerald-500/5";
  }
  if (state === "current") {
    return "border-brand-500/40 bg-brand-500/10";
  }
  return "border-border bg-surface-raised";
}

function connectorClasses(state: SwapTimelineState, flow: SwapTimelineFlow): string {
  if (state === "completed") {
    return flow === "refund" ? "bg-amber-500/40" : "bg-emerald-500/40";
  }
  return "bg-border";
}

export function SwapProgressTimeline({
  steps,
  flow = "success",
  className,
  ariaLabel = "Swap progress timeline",
}: SwapProgressTimelineProps) {
  return (
    <ol
      role="list"
      aria-label={ariaLabel}
      className={clsx("space-y-3", className)}
      data-flow={flow}
    >
      {steps.map((step, index) => {
        const ts = formatTimestamp(step.timestamp);
        const isLast = index === steps.length - 1;
        return (
          <li
            key={step.key}
            className="flex gap-3"
            data-state={step.state}
            aria-current={step.state === "current" ? "step" : undefined}
          >
            <div className="flex flex-col items-center">
              <span
                className={clsx(
                  "flex h-8 w-8 items-center justify-center rounded-full border",
                  ringClasses(step.state, flow)
                )}
              >
                {flow === "refund" && step.state === "current" ? (
                  <X className="h-4 w-4 text-amber-500" aria-hidden="true" />
                ) : (
                  <StepIcon state={step.state} flow={flow} />
                )}
              </span>
              {!isLast && (
                <span
                  className={clsx("mt-1 h-full w-px", connectorClasses(step.state, flow))}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={clsx(
                    "text-sm font-semibold",
                    step.state === "upcoming" ? "text-text-muted" : "text-text-primary"
                  )}
                >
                  {step.label}
                </p>
                {step.chain && (
                  <span className="text-xs uppercase tracking-[0.18em] text-text-muted">
                    {step.chain}
                  </span>
                )}
              </div>

              {step.description && (
                <p className="mt-1 text-sm text-text-secondary">{step.description}</p>
              )}

              <p className="mt-1 text-xs text-text-muted">
                {ts ?? (step.state === "upcoming" ? "Pending" : "Awaiting timestamp")}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
