"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  Wallet,
} from "lucide-react";

import { Badge, Button } from "@/components/ui";
import { SigningProgressStepper } from "@/components/transactions/SigningProgressStepper";
import { cn } from "@/lib/utils";
import { getExplorerUrl } from "@/lib/explorers";
import { useWalletStore } from "@/hooks/useWallet";
import { Order, OrderSide, Transaction, TransactionStatus } from "@/types";

interface OrderTakeModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (order: Order) => Promise<void>;
  workflowTx?: Transaction | null;
}

function shortAddress(value: string) {
  if (value.length <= 18) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function requiredFundingChain(order: Order) {
  return order.side === OrderSide.BUY ? order.chainOut : order.chainIn;
}

function requiredFundingToken(order: Order) {
  return order.side === OrderSide.BUY ? order.tokenOut : order.tokenIn;
}

function requiredFundingAmount(order: Order) {
  return order.side === OrderSide.BUY ? order.total : order.amount;
}

export function OrderTakeModal({
  order,
  isOpen,
  onClose,
  onConfirm,
  workflowTx,
}: OrderTakeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const { address, chain, isConnected } = useWalletStore();
  const [reviewArmed, setReviewArmed] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setReviewArmed(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (workflowTx) {
      setReviewArmed(true);
    }
  }, [workflowTx]);

  const validation = useMemo(() => {
    if (!order) {
      return { ready: false, items: [] as Array<{ ok: boolean; label: string }> };
    }

    const expectedChain = requiredFundingChain(order).toLowerCase();
    const connectedChain = chain?.toLowerCase() ?? null;
    const isDifferentMaker = !address || address !== order.maker;

    return {
      ready: Boolean(isConnected && connectedChain === expectedChain && isDifferentMaker),
      items: [
        {
          ok: isConnected,
          label: isConnected ? "Wallet connected" : "Connect a wallet before matching",
        },
        {
          ok: connectedChain === expectedChain,
          label:
            connectedChain === expectedChain
              ? `Connected to ${requiredFundingChain(order)}`
              : `Switch wallet to ${requiredFundingChain(order)} to fund the taker side`,
        },
        {
          ok: isDifferentMaker,
          label: isDifferentMaker
            ? "Taker address differs from maker"
            : "Maker and taker cannot be the same address",
        },
      ],
    };
  }, [address, chain, isConnected, order]);

  if (!isOpen || !order) return null;

  const fundingChain = requiredFundingChain(order);
  const fundingToken = requiredFundingToken(order);
  const fundingAmount = requiredFundingAmount(order);
  const receiveChain = order.side === OrderSide.BUY ? order.chainIn : order.chainOut;
  const receiveToken = order.side === OrderSide.BUY ? order.tokenIn : order.tokenOut;
  const receiveAmount = order.side === OrderSide.BUY ? order.amount : order.total;
  const explorerUrl =
    workflowTx?.hash && workflowTx.hash !== "pending"
      ? workflowTx.explorerUrl ?? getExplorerUrl(workflowTx.chain, workflowTx.hash)
      : null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end"
      onClick={(event) => event.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 border-b border-border bg-background/95 px-6 py-5 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-500">
                Order Detail
              </p>
              <h2 className="mt-2 text-2xl font-bold text-text-primary">{order.pair}</h2>
              <p className="mt-1 text-sm text-text-secondary">
                Review metadata, validate wallet prerequisites, and confirm the taker side.
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="rounded-3xl border border-border bg-surface-overlay/40 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Taker Funds
                </p>
                <p className="mt-2 text-3xl font-black text-text-primary">
                  {fundingAmount} {fundingToken}
                </p>
                <Badge variant="chain" chain={fundingChain} className="mt-3">
                  {fundingChain}
                </Badge>
              </div>
              <ArrowRight className="h-5 w-5 text-brand-500" />
              <div className="text-right">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                  Taker Receives
                </p>
                <p className="mt-2 text-3xl font-black text-emerald-500">
                  {receiveAmount} {receiveToken}
                </p>
                <Badge variant="chain" chain={receiveChain} className="mt-3">
                  {receiveChain}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <MetaCard label="Maker" value={shortAddress(order.maker)} />
            <MetaCard label="Order Type" value={order.orderType ?? "limit"} />
            <MetaCard label="Expiry" value={order.expiresAt ? new Date(order.expiresAt).toLocaleString() : "Not set"} />
            <MetaCard label="Partial Fills" value={order.allowPartialFills ? "Allowed" : "Disabled"} />
            <MetaCard label="Minimum Fill" value={order.minFillAmount ?? "Full size only"} />
            <MetaCard label="Amendments" value={String(order.amendmentCount ?? 0)} />
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-brand-500" />
              <p className="text-sm font-semibold text-text-primary">Wallet Prerequisites</p>
            </div>
            <div className="mt-4 space-y-3">
              {validation.items.map((item) => (
                <div key={item.label} className="flex items-start gap-3">
                  {item.ok ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="mt-0.5 h-4 w-4 text-amber-400" />
                  )}
                  <p className={cn("text-sm", item.ok ? "text-text-primary" : "text-text-secondary")}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {!workflowTx && !reviewArmed && (
            <div className="rounded-2xl border border-brand-500/20 bg-brand-500/5 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 text-brand-500" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Confirmation required</p>
                  <p className="mt-1 text-sm text-text-secondary">
                    Matching this order will prompt your wallet to approve, sign, broadcast, and
                    confirm the taker-side transaction on {fundingChain}.
                  </p>
                </div>
              </div>
            </div>
          )}

          {reviewArmed && !workflowTx && (
            <div className="rounded-2xl border border-border bg-surface-overlay/30 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                Final Review
              </p>
              <div className="mt-3 grid gap-2 text-sm text-text-secondary">
                <p>You will lock {fundingAmount} {fundingToken} on {fundingChain}.</p>
                <p>You expect to receive {receiveAmount} {receiveToken} from {receiveChain}.</p>
                <p>Order expiry: {order.expiresAt ? new Date(order.expiresAt).toLocaleString() : "Not set"}.</p>
              </div>
            </div>
          )}

          {workflowTx?.lifecycle && (
            <SigningProgressStepper lifecycle={workflowTx.lifecycle} retryLabel="Retry match" />
          )}

          {workflowTx?.status === TransactionStatus.COMPLETED && explorerUrl && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
              <p className="text-sm font-semibold text-emerald-400">Match submitted successfully.</p>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm text-text-primary underline underline-offset-4"
              >
                View transaction on explorer
              </a>
            </div>
          )}

          <div className="flex flex-col gap-3 border-t border-border pt-2">
            {!reviewArmed ? (
              <Button
                className="w-full"
                onClick={() => setReviewArmed(true)}
                disabled={!validation.ready}
              >
                Review Match
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => void onConfirm(order)}
                disabled={!validation.ready || Boolean(workflowTx)}
                loading={Boolean(workflowTx && workflowTx.status !== TransactionStatus.COMPLETED)}
              >
                Confirm Match
              </Button>
            )}
            <Button variant="secondary" className="w-full" onClick={onClose}>
              {workflowTx?.status === TransactionStatus.COMPLETED ? "Close" : "Cancel"}
            </Button>
          </div>

          <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-overlay/30 p-4 text-sm text-text-secondary">
            <Clock3 className="mt-0.5 h-4 w-4 text-brand-500" />
            <p>
              ChainBridge executes this match as an atomic workflow. If the taker-side transaction
              is not confirmed before expiry, the order remains available or times out safely.
            </p>
          </div>
        </div>
      </aside>
    </div>,
    document.body
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 text-sm text-text-primary">{value}</p>
    </div>
  );
}
