"use client";

import { AlertCircle, CheckCircle2, Clock3, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui";
import { TransactionLifecycle, TransactionStep } from "@/types";
import { cn } from "@/lib/utils";

interface SigningProgressStepperProps {
  lifecycle: TransactionLifecycle;
  onRetry?: () => void;
  retryLabel?: string;
}

function stepIcon(step: TransactionStep) {
  if (step.status === "completed") {
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  }
  if (step.status === "error") {
    return <AlertCircle className="h-4 w-4 text-red-400" />;
  }
  return (
    <Clock3
      className={cn(
        "h-4 w-4",
        step.status === "active" ? "text-brand-500 animate-pulse" : "text-text-muted"
      )}
    />
  );
}

export function SigningProgressStepper({
  lifecycle,
  onRetry,
  retryLabel = "Retry",
}: SigningProgressStepperProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface-overlay/40 p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
            Signing Progress
          </p>
          {lifecycle.errorMessage && (
            <p className="mt-1 text-sm text-red-300">{lifecycle.errorMessage}</p>
          )}
        </div>
        {lifecycle.retryable && onRetry && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onRetry}
            icon={<RefreshCw className="h-3.5 w-3.5" />}
          >
            {retryLabel}
          </Button>
        )}
      </div>

      <div className="mt-4 space-y-3">
        {lifecycle.steps.map((step) => (
          <div key={step.key} className="flex gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
            <div className="mt-0.5">{stepIcon(step)}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-text-primary">{step.label}</p>
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-[0.18em]",
                    step.status === "completed" && "text-emerald-500",
                    step.status === "active" && "text-brand-500",
                    step.status === "error" && "text-red-400",
                    step.status === "idle" && "text-text-muted"
                  )}
                >
                  {step.status}
                </span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{step.description}</p>
              {step.errorMessage && <p className="mt-2 text-xs text-red-300">{step.errorMessage}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
