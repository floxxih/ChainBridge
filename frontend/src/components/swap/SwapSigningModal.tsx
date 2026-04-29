"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Clock } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui";
import { SigningProgressStepper } from "@/components/transactions/SigningProgressStepper";
import { TransactionLifecycle } from "@/types";

const SIGNING_TIMEOUT_SECONDS = 120;

interface SwapSigningModalProps {
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  onRetry: () => void;
  lifecycle: TransactionLifecycle | null;
}

export function SwapSigningModal({
  open,
  onClose,
  onCancel,
  onRetry,
  lifecycle,
}: SwapSigningModalProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!open) {
      setElapsed(0);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  const isCompleted = lifecycle?.steps.every((s) => s.status === "completed") ?? false;
  const hasError = lifecycle?.steps.some((s) => s.status === "error") ?? false;
  const isActiveStep = lifecycle?.steps.some((s) => s.status === "active") ?? false;
  // After sign step completes, wallet interaction is done
  const isSigned = lifecycle?.steps.find((s) => s.key === "sign")?.status === "completed" ?? false;
  const isTimedOut = !isCompleted && !hasError && elapsed >= SIGNING_TIMEOUT_SECONDS;
  const remaining = Math.max(0, SIGNING_TIMEOUT_SECONDS - elapsed);

  // Allow closing only once completed, errored, or timed out
  const canClose = isCompleted || hasError || isTimedOut;

  return (
    <Modal open={open} onClose={canClose ? onClose : () => {}} size="md">
      <div className="flex flex-col gap-5">
        <div className="text-center space-y-1">
          <h3 className="text-lg font-semibold text-text-primary">Transaction Signing</h3>
          <p className="text-sm text-text-secondary">
            {isCompleted
              ? "Swap submitted successfully."
              : hasError
                ? "An error occurred during signing."
                : "Please review and sign the transaction in your wallet."}
          </p>
        </div>

        {lifecycle && (
          <SigningProgressStepper
            lifecycle={lifecycle}
            onRetry={lifecycle.retryable ? onRetry : undefined}
            retryLabel="Retry Swap"
          />
        )}

        {/* Countdown shown while waiting for wallet signature */}
        {isActiveStep && !isSigned && !isTimedOut && !hasError && (
          <div className="flex items-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3 text-sm text-text-secondary">
            <Clock className="h-4 w-4 shrink-0 text-brand-500" />
            <span>Waiting for wallet — {remaining}s remaining</span>
          </div>
        )}

        {isTimedOut && (
          <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
            <div>
              <p className="text-sm font-semibold text-text-primary">Signing timed out</p>
              <p className="mt-1 text-sm text-text-secondary">
                Your wallet did not respond in time. You can retry or cancel the swap.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 border-t border-border pt-4">
          {isCompleted ? (
            <Button variant="primary" className="flex-1" onClick={onClose}>
              Done
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1"
                onClick={onCancel}
                disabled={isSigned && !hasError && !isTimedOut}
              >
                Cancel
              </Button>
              {(isTimedOut || hasError) && (
                <Button variant="primary" className="flex-1" onClick={onRetry}>
                  Retry
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
