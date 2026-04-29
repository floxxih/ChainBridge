"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

export interface CancelOrderDialogOrder {
  id: string;
  pair: string;
  side?: "buy" | "sell";
  amount?: string;
  price?: string;
  total?: string;
  tokenIn?: string;
  tokenOut?: string;
  chainIn?: string;
  chainOut?: string;
}

export interface CancelOrderDialogProps {
  /** Whether the dialog is open. */
  open: boolean;
  /** Order being cancelled — drives the summary block. */
  order: CancelOrderDialogOrder | null;
  /** Loading flag while the cancel request is in flight. */
  loading?: boolean;
  /**
   * Called when the user confirms cancellation. Throw / reject to surface an
   * inline error and keep the dialog open for retry.
   */
  onConfirm: (order: CancelOrderDialogOrder) => void | Promise<void>;
  /** Called when the user dismisses (Esc, backdrop, "Keep order"). */
  onClose: () => void;
  /**
   * When `true` (the default) the destructive button is gated behind a
   * confirmation checkbox. Disable only if the surrounding flow already
   * includes a separate confirmation step.
   */
  requireConfirmation?: boolean;
  /** Override the irreversibility copy if reused outside the orderbook. */
  irreversibleHelpText?: string;
}

const DEFAULT_DESC =
  "This cannot be undone. The order will be removed from the open book and will no longer be matchable.";

/**
 * Confirmation dialog for order cancellation.
 *
 * Acceptance criteria (issue #264):
 * - **Explains irreversible effects**: warning copy + bullet list of
 *   consequences in the dialog body. The dialog's `aria-describedby` (set by
 *   the underlying `Modal`) ties the description to the dialog itself so AT
 *   announces it on focus.
 * - **Requires explicit user action**: the destructive button is disabled
 *   until the user ticks the confirmation checkbox; initial focus lands on
 *   the safe "Keep order" button so a stray `Enter` keystroke can never
 *   destroy work.
 * - **Keyboard + screen reader support**: built on the existing accessible
 *   `Modal` primitive (focus trap, focus restoration, body scroll lock,
 *   `role="dialog"`, `aria-modal`, `aria-labelledby`, `aria-describedby`,
 *   Esc-to-dismiss). Errors are announced via a polite live region; the
 *   busy state is exposed via `aria-busy`.
 */
export function CancelOrderDialog({
  open,
  order,
  loading = false,
  onConfirm,
  onClose,
  requireConfirmation = true,
  irreversibleHelpText,
}: CancelOrderDialogProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const keepFocusRef = useRef<HTMLButtonElement>(null);
  const errorId = useId();

  // Reset local state every time the dialog opens for a new order.
  useEffect(() => {
    if (!open) return;
    setAcknowledged(false);
    setError(null);
  }, [open, order?.id]);

  // The Modal moves focus to the first focusable element. Override that and
  // aim focus at the safer "Keep order" button so a stray Enter keystroke
  // cannot accidentally cancel the order.
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => keepFocusRef.current?.focus(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  const confirmDisabled = !order || loading || (requireConfirmation && !acknowledged);

  async function handleConfirm() {
    if (!order || confirmDisabled) return;
    setError(null);
    try {
      await onConfirm(order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancellation failed. Please try again.");
    }
  }

  function handleClose() {
    if (loading) return; // don't dismiss while a request is in flight
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Cancel this order?"
      description={irreversibleHelpText ?? DEFAULT_DESC}
      size="md"
    >
      <div className="flex flex-col gap-5" data-testid="cancel-order-dialog-body">
        <div className="flex items-start gap-3 rounded-xl border border-status-error/20 bg-status-error/10 p-3 text-sm text-text-secondary">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 shrink-0 text-status-error"
            aria-hidden="true"
          />
          <p>
            <strong className="text-text-primary">Irreversible action.</strong> Once cancelled, an
            order cannot be restored — only re-created.
          </p>
        </div>

        {order && <OrderSummary order={order} />}

        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-status-error">
              •
            </span>
            <span>
              Outstanding liquidity is withdrawn{" "}
              <strong className="text-text-primary">immediately</strong>.
            </span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-status-error">
              •
            </span>
            <span>In-flight matches at the moment of cancellation may still settle.</span>
          </li>
          <li className="flex gap-2">
            <span aria-hidden="true" className="text-status-error">
              •
            </span>
            <span>
              You can re-create an equivalent order, but the original ID cannot be restored.
            </span>
          </li>
        </ul>

        {requireConfirmation && (
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface-raised p-3 text-sm text-text-secondary hover:border-status-error/40">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 rounded border-border accent-status-error"
              data-testid="cancel-order-confirm-checkbox"
            />
            <span>
              I understand this is irreversible and want to cancel order{" "}
              <code className="rounded bg-surface-overlay px-1 py-0.5 text-xs text-text-primary">
                {order?.id ?? "—"}
              </code>
              .
            </span>
          </label>
        )}

        <p
          role="alert"
          aria-live="polite"
          id={errorId}
          className={cn(
            "min-h-[1.25rem] text-sm text-status-error",
            !error && "sr-only",
          )}
        >
          {error}
        </p>

        <div
          aria-busy={loading || undefined}
          className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"
        >
          <Button
            ref={keepFocusRef}
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
            data-testid="cancel-order-keep"
          >
            Keep order
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={confirmDisabled}
            loading={loading}
            aria-describedby={error ? errorId : undefined}
            data-testid="cancel-order-confirm"
          >
            {loading ? "Cancelling…" : "Cancel order"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function OrderSummary({ order }: { order: CancelOrderDialogOrder }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-xl border border-border bg-surface-raised p-4 text-sm">
      <SummaryRow label="Pair" value={order.pair} />
      {order.side && <SummaryRow label="Side" value={order.side.toUpperCase()} />}
      {order.amount && (
        <SummaryRow label="Amount" value={`${order.amount} ${order.tokenIn ?? ""}`.trim()} />
      )}
      {order.price && (
        <SummaryRow label="Price" value={`${order.price} ${order.tokenOut ?? ""}`.trim()} />
      )}
      {order.total && (
        <SummaryRow label="Total" value={`${order.total} ${order.tokenOut ?? ""}`.trim()} />
      )}
      <SummaryRow label="Order ID" value={order.id} mono />
    </dl>
  );
}

function SummaryRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <>
      <dt className="text-xs uppercase tracking-wider text-text-muted">{label}</dt>
      <dd
        className={cn("text-text-primary text-right", mono && "font-mono text-xs break-all")}
      >
        {value}
      </dd>
    </>
  );
}
