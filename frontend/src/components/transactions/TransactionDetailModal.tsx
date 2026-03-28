"use client";

import { Transaction, TransactionStatus } from "@/types";
import {
  X,
  ExternalLink,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Hash,
  Globe,
  Zap,
  Download,
  Share2,
} from "lucide-react";
import { Button, Badge, Card } from "@/components/ui";
import { clsx } from "clsx";
import { getExplorerUrl } from "@/lib/explorers";
import { SigningProgressStepper } from "./SigningProgressStepper";
import {
  ActivityTimeline,
  type ActivityTimelineEvent,
} from "@/components/timeline/ActivityTimeline";

interface TransactionDetailModalProps {
  tx: Transaction;
  onClose: () => void;
  onRetry?: () => void;
}

export function TransactionDetailModal({ tx, onClose, onRetry }: TransactionDetailModalProps) {
  const explorerUrl = () => {
    return tx.explorerUrl ?? getExplorerUrl(tx.chain, tx.hash);
  };

  const timelineEvents: ActivityTimelineEvent[] = tx.lifecycle
    ? tx.lifecycle.steps.map((step) => {
        const status =
          step.status === "completed"
            ? "confirmed"
            : step.status === "error"
              ? "failed"
              : "pending";

        return {
          id: `${tx.id}-${step.key}`,
          label: step.label,
          timestamp:
            step.status === "completed" ||
            (step.key === tx.lifecycle?.currentStep && step.status !== "idle")
              ? tx.timestamp
              : null,
          chain: tx.chain,
          status,
          txHash: tx.hash !== "pending" ? tx.hash : undefined,
          href: tx.hash !== "pending" ? explorerUrl() : undefined,
          description: step.errorMessage ?? step.description,
        } satisfies ActivityTimelineEvent;
      })
    : [
        {
          id: tx.id,
          label: tx.type.replace("_", " "),
          timestamp: tx.timestamp,
          chain: tx.chain,
          status:
            tx.status === TransactionStatus.COMPLETED
              ? "confirmed"
              : tx.status === TransactionStatus.FAILED
                ? "failed"
                : "pending",
          txHash: tx.hash !== "pending" ? tx.hash : undefined,
          href: tx.hash !== "pending" ? explorerUrl() : undefined,
          description: tx.failureReason,
        },
      ];

  const progress =
    tx.status === TransactionStatus.COMPLETED
      ? 100
      : Math.min(Math.round((tx.confirmations / tx.requiredConfirmations) * 100), 99);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-background/60 backdrop-blur-md" onClick={onClose} />

      <Card
        variant="glass"
        className="relative w-full max-w-2xl overflow-hidden border-border/50 shadow-2xl animate-in fade-in zoom-in duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 border border-brand-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-text-primary">Transaction Details</h2>
              <p className="text-xs text-text-muted font-medium uppercase tracking-wider">
                {tx.type.replace("_", " ")}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-text-muted hover:bg-surface-overlay hover:text-text-primary transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Status Banner */}
          <div
            className={clsx(
              "flex items-center justify-between rounded-2xl p-4 border",
              tx.status === TransactionStatus.COMPLETED
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-brand-500/5 border-brand-500/20"
            )}
          >
            <div className="flex items-center gap-3">
              {tx.status === TransactionStatus.COMPLETED ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <Clock className="h-5 w-5 text-brand-500 animate-pulse" />
              )}
              <span className="font-bold text-text-primary capitalize">{tx.status}</span>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                Confirmations
              </p>
              <p className="text-sm font-bold text-text-primary">
                {tx.confirmations} / {tx.requiredConfirmations}
              </p>
            </div>
          </div>

          {/* Grid Info */}
          <div className="grid gap-6 sm:grid-cols-2">
            <InfoBlock label="Network" value={tx.chain} icon={<Globe className="h-4 w-4" />} />
            <InfoBlock
              label="Amount"
              value={`${tx.amount} ${tx.token}`}
              icon={<Zap className="h-4 w-4" />}
            />
            <div className="sm:col-span-2">
              <InfoBlock
                label="Transaction Hash"
                value={tx.hash}
                icon={<Hash className="h-4 w-4" />}
                isCopyable
              />
            </div>
          </div>

          {/* Verification Section */}
          <div className="rounded-2xl bg-surface-overlay/50 border border-border p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                HTLC Verification
              </h3>
              <Badge variant={tx.proofVerified ? "success" : "info"}>
                {tx.proofVerified ? "Proven & Verified" : "Awaiting Witness"}
              </Badge>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Atomic swap security is guaranteed by cryptographic hashes. The redemption proof must
              match the lock secret to release funds.
            </p>
            {tx.proofVerified && (
              <div className="mt-4 flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                <ShieldCheck className="h-3 w-3" />
                Proof SHA256 matches HTLC lock condition
              </div>
            )}
          </div>

          {tx.lifecycle && <SigningProgressStepper lifecycle={tx.lifecycle} onRetry={onRetry} />}

          <ActivityTimeline
            title="Swap Activity"
            events={timelineEvents}
            emptyMessage="No activity has been recorded for this swap yet."
          />

          {tx.failureReason && (
            <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
              <p className="text-sm font-semibold text-red-300">Submission error</p>
              <p className="mt-1 text-sm text-text-secondary">{tx.failureReason}</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-3 bg-surface-overlay/30 p-6 border-t border-border/50">
          <a href={explorerUrl()} target="_blank" rel="noopener noreferrer" className="flex-1">
            <Button className="w-full gap-2 rounded-xl">
              View on Explorer <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
          <Button variant="secondary" size="icon" className="rounded-xl h-11 w-11 shadow-sm">
            <Download className="h-5 w-5" />
          </Button>
          <Button variant="secondary" size="icon" className="rounded-xl h-11 w-11 shadow-sm">
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </Card>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
  isCopyable,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  isCopyable?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
        {icon}
        {label}
      </p>
      <div
        className={clsx(
          "rounded-xl bg-surface-overlay border border-border p-3 text-sm font-medium text-text-primary truncate",
          isCopyable && "font-mono text-xs"
        )}
      >
        {value}
      </div>
    </div>
  );
}
