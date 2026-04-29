"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import { Button, Card, EmptyState, Input, Modal, ToastContainer } from "@/components/ui";
import { claimHTLC, fetchHTLCs, HTLCRecord, refundHTLC } from "@/lib/htlcApi";
import { cn } from "@/lib/utils";
import { shortenHash } from "@/lib/format";
import { SigningProgressStepper } from "@/components/transactions/SigningProgressStepper";
import { useTransactionStore } from "@/hooks/useTransactions";
import { TransactionStatus } from "@/types";
import {
  buildCompletedLifecycle,
  buildTransactionLifecycle,
  sleep,
} from "@/lib/transactionLifecycle";
import { getExplorerUrl } from "@/lib/explorers";
import { CountdownTimer } from "@/components/htlc/CountdownTimer";
import {
  ActivityTimeline,
  type ActivityTimelineEvent,
} from "@/components/timeline/ActivityTimeline";
import {
  calculateBackoffDelay,
  getNextRetryTime,
  isReadyToRetry,
  formatRetryCountdown,
} from "@/lib/retryUtils";

type ToastMessage = {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "error" | "info";
};

const STATUS_OPTIONS = ["all", "active", "claimed", "refunded", "expired"];

function validateSecret(secret: string) {
  const trimmed = secret.trim();
  if (!trimmed) return "A preimage secret is required.";
  if (!/^[0-9a-fA-F]+$/.test(trimmed)) {
    return "Secret must be hex-encoded.";
  }
  if (trimmed.length !== 64) {
    return "Secret must be 32 bytes represented as 64 hex characters.";
  }
  return null;
}

function formatRemaining(seconds: number) {
  if (seconds <= 0) return "Expired";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function shortAddress(value: string) {
  return shortenHash(value, { prefixLength: 8, suffixLength: 6 });
}

export default function HTLCStatusPage() {
  const [htlcs, setHtlcs] = useState<HTLCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [participant, setParticipant] = useState("");
  const [hashLock, setHashLock] = useState("");
  const [status, setStatus] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimTxId, setClaimTxId] = useState<string | null>(null);
  const [claimExplorerUrl, setClaimExplorerUrl] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<HTLCRecord | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [optimisticUpdates, setOptimisticUpdates] = useState<Set<string>>(new Set());
  const [retryCountdown, setRetryCountdown] = useState<number>(0);
  const transactions = useTransactionStore((state) => state.transactions);
  const addTransaction = useTransactionStore((state) => state.addTransaction);
  const updateTransaction = useTransactionStore((state) => state.updateTransaction);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const loadHTLCs = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setRefreshing(!showSpinner);
      setError(null);
      try {
        const data = await fetchHTLCs({
          participant: participant.trim() || undefined,
          hash_lock: hashLock.trim() || undefined,
          status: status === "all" || status === "expired" ? undefined : status,
        });
        setHtlcs(data);
        if (!selectedId && data[0]) {
          setSelectedId(data[0].id);
        } else if (selectedId && !data.some((item) => item.id === selectedId)) {
          setSelectedId(data[0]?.id ?? null);
        }
      } catch (loadError: any) {
        setError(loadError?.response?.data?.detail ?? "Failed to load HTLCs");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [hashLock, participant, selectedId, status]
  );

  useEffect(() => {
    void loadHTLCs();
  }, [loadHTLCs]);

  useEffect(() => {
    setClaimError(null);
    setClaimTxId(null);
    setClaimExplorerUrl(null);
    setRetryCountdown(0);
  }, [selectedId]);

  useEffect(() => {
    if (!claimTx?.nextRetryAt) {
      setRetryCountdown(0);
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, claimTx.nextRetryAt! - Date.now());
      setRetryCountdown(Math.ceil(remaining / 1000));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [claimTx?.nextRetryAt]);

  const selected = htlcs.find((item) => item.id === selectedId) ?? htlcs[0] ?? null;
  const secretError = validateSecret(secret);
  const claimTx = transactions.find((transaction) => transaction.id === claimTxId) ?? null;
  const selectedTimelineEvents: ActivityTimelineEvent[] = selected
    ? selected.timeline.map((event) => ({
        id: `${selected.id}-${event.label}`,
        label: event.label,
        timestamp: event.timestamp,
        chain: "Stellar",
        status: event.completed ? "confirmed" : "pending",
        txHash: selected.onchain_id ?? undefined,
        href: selected.onchain_id ? getExplorerUrl("stellar", selected.onchain_id) : undefined,
      }))
    : [];

  const enriched = htlcs.map((item) => {
    const secondsRemaining = Math.max(item.time_lock - now, 0);
    const displayStatus =
      item.status === "active" && secondsRemaining === 0 ? "expired" : item.status;
    return {
      ...item,
      secondsRemaining,
      displayStatus,
      urgency: secondsRemaining === 0 ? "critical" : secondsRemaining < 3600 ? "warning" : "normal",
    };
  });

  const visibleHtlcs =
    status === "all" ? enriched : enriched.filter((item) => item.displayStatus === status);

  const activeCount = enriched.filter((item) => item.displayStatus === "active").length;
  const claimableCount = enriched.filter((item) => item.can_claim).length;
  const refundableCount = enriched.filter((item) => item.can_refund).length;

  function pushToast(toast: Omit<ToastMessage, "id">) {
    setToasts((current) => [...current, { id: `${Date.now()}-${Math.random()}`, ...toast }]);
  }

  async function handleClaim() {
    if (!selected || secretError) return;
    const txId = `htlc-claim-${selected.id}`;
    const fallbackHash = selected.onchain_id ?? `claim-${Date.now().toString(16)}`;
    const explorerUrl = selected.onchain_id
      ? getExplorerUrl("stellar", selected.onchain_id)
      : "/transactions";

    setActionLoading(true);
    setClaimError(null);
    setClaimTxId(txId);
    setClaimExplorerUrl(explorerUrl);

    const originalHtlcs = htlcs;
    setOptimisticUpdates((prev) => new Set(prev).add(selected.id));

    const basePayload = {
      hash: selected.onchain_id ?? "pending",
      chain: "Stellar",
      type: "swap_redeem" as const,
      amount: String(selected.amount),
      token: "XLM",
      status: TransactionStatus.PENDING,
      confirmations: 0,
      requiredConfirmations: 1,
      timestamp: new Date().toISOString(),
      explorerUrl: selected.onchain_id ? getExplorerUrl("stellar", selected.onchain_id) : undefined,
      lifecycle: buildTransactionLifecycle("Stellar", "approval"),
      failureReason: undefined,
    };

    if (transactions.some((transaction) => transaction.id === txId)) {
      updateTransaction(txId, basePayload);
    } else {
      addTransaction({
        id: txId,
        ...basePayload,
      });
    }

    try {
      await sleep(500);
      updateTransaction(txId, {
        lifecycle: buildTransactionLifecycle("Stellar", "sign"),
      });

      await sleep(700);
      updateTransaction(txId, {
        hash: fallbackHash,
        status: TransactionStatus.CONFIRMING,
        lifecycle: buildTransactionLifecycle("Stellar", "broadcast"),
      });

      const claimed = await claimHTLC(selected.id, secret.trim());

      await sleep(800);
      updateTransaction(txId, {
        hash: claimed.onchain_id ?? fallbackHash,
        status: TransactionStatus.CONFIRMING,
        lifecycle: buildTransactionLifecycle("Stellar", "confirm"),
      });

      await sleep(1000);
      updateTransaction(txId, {
        hash: claimed.onchain_id ?? fallbackHash,
        status: TransactionStatus.COMPLETED,
        confirmations: 1,
        proofVerified: true,
        explorerUrl: claimed.onchain_id ? getExplorerUrl("stellar", claimed.onchain_id) : undefined,
        lifecycle: buildCompletedLifecycle("Stellar"),
      });

      if (claimed.onchain_id) {
        setClaimExplorerUrl(getExplorerUrl("stellar", claimed.onchain_id));
      }
      pushToast({
        type: "success",
        title: "HTLC claimed",
        message: `Secret submitted for ${selected.id}.`,
      });
      setSecret("");
      await loadHTLCs(false);
    } catch (claimError: any) {
      const existingTx = transactions.find((t) => t.id === txId);
      const currentRetryCount = existingTx?.retryCount ?? 0;
      const isRecoverable = claimError?.response?.status >= 500 || !claimError?.response?.status;
      const nextRetry = isRecoverable ? getNextRetryTime(currentRetryCount) : undefined;

      const message =
        claimError?.response?.data?.detail ??
        "Set NEXT_PUBLIC_CHAINBRIDGE_API_KEY to enable claim actions.";

      const errorDetails = [
        message,
        isRecoverable && currentRetryCount < 3
          ? `Retry ${currentRetryCount + 1} of 3 ${nextRetry ? `(${formatRetryCountdown(nextRetry - Date.now())})` : ""}`
          : null,
      ]
        .filter(Boolean)
        .join(" • ");

      setClaimError(errorDetails);
      setHtlcs(originalHtlcs);

      console.warn("[HTLC Claim Error]", {
        id: selected.id,
        status: claimError?.response?.status,
        message,
        retryCount: currentRetryCount,
        recoverable: isRecoverable,
        timestamp: new Date().toISOString(),
      });

      updateTransaction(txId, {
        status: TransactionStatus.FAILED,
        failureReason: message,
        retryCount: currentRetryCount + 1,
        nextRetryAt: nextRetry,
        lifecycle: buildTransactionLifecycle("Stellar", "broadcast", {
          failedStep: "broadcast",
          errorMessage: `Stellar broadcast failed: ${message}`,
          retryable: isRecoverable && currentRetryCount < 3,
        }),
      });

      pushToast({
        type: "error",
        title: "Claim failed",
        message: errorDetails,
      });
    } finally {
      setActionLoading(false);
      setOptimisticUpdates((prev) => {
        const next = new Set(prev);
        next.delete(selected.id);
        return next;
      });
    }
  }

  async function handleRefund() {
    if (!refundTarget) return;
    setActionLoading(true);
    const originalHtlcs = htlcs;
    setOptimisticUpdates((prev) => new Set(prev).add(refundTarget.id));

    setHtlcs((current) =>
      current.map((item) =>
        item.id === refundTarget.id
          ? {
              ...item,
              status: "refunded",
              can_claim: false,
              can_refund: false,
              phase: "refunded",
              seconds_remaining: 0,
            }
          : item
      )
    );

    try {
      const refunded = await refundHTLC(refundTarget.id);
      setHtlcs((current) =>
        current.map((item) =>
          item.id === refundTarget.id
            ? {
                ...item,
                ...refunded,
                status: "refunded",
                can_claim: false,
                can_refund: false,
                phase: "refunded",
                seconds_remaining: 0,
              }
            : item
        )
      );
      pushToast({
        type: "success",
        title: "Refund submitted",
        message: `Refund queued for ${refundTarget.id}.`,
      });
      setRefundTarget(null);
      await loadHTLCs(false);
    } catch (refundError: any) {
      const isRecoverable = refundError?.response?.status >= 500 || !refundError?.response?.status;
      const message =
        refundError?.response?.data?.detail ??
        "Set NEXT_PUBLIC_CHAINBRIDGE_API_KEY to enable refund actions.";

      console.warn("[HTLC Refund Error]", {
        id: refundTarget.id,
        status: refundError?.response?.status,
        message,
        recoverable: isRecoverable,
        timestamp: new Date().toISOString(),
      });

      setHtlcs(originalHtlcs);
      pushToast({
        type: "error",
        title: "Refund failed",
        message: isRecoverable ? `${message} (retryable)` : message,
      });
    } finally {
      setActionLoading(false);
      setOptimisticUpdates((prev) => {
        const next = new Set(prev);
        next.delete(refundTarget.id);
        return next;
      });
    }
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20">
      <div className="grid gap-10 lg:grid-cols-[1.35fr_0.95fr]">
        <section className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
                <Activity className="h-3.5 w-3.5" />
                HTLC Tracker
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
                Monitor every lock, claim, and refund window
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-text-secondary">
                Search by participant or hash lock, watch live expiry timers, and act on HTLCs as
                they become claimable or refundable.
              </p>
            </div>

            <Button
              variant="secondary"
              icon={<RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />}
              onClick={() => void loadHTLCs(false)}
            >
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard
              label="Active Locks"
              value={String(activeCount)}
              icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
            />
            <StatCard
              label="Claimable Now"
              value={String(claimableCount)}
              icon={<ArrowRightLeft className="h-4 w-4 text-brand-500" />}
            />
            <StatCard
              label="Refund Ready"
              value={String(refundableCount)}
              icon={<TimerReset className="h-4 w-4 text-amber-400" />}
            />
          </div>

          <Card variant="raised" className="p-5">
            <div className="grid gap-3 md:grid-cols-[1.2fr_1fr_auto]">
              <Input
                label="Participant"
                value={participant}
                onChange={(event) => setParticipant(event.target.value)}
                placeholder="Sender or receiver address"
                leftElement={<Search className="h-4 w-4" />}
              />
              <Input
                label="Hash Lock"
                value={hashLock}
                onChange={(event) => setHashLock(event.target.value)}
                placeholder="Filter by hash lock"
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">Status</label>
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => void loadHTLCs()} icon={<Search className="h-4 w-4" />}>
                Apply Filters
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setParticipant("");
                  setHashLock("");
                  setStatus("all");
                }}
              >
                Clear
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              {STATUS_OPTIONS.filter((option) => option !== "all").map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setStatus(option)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] transition",
                    status === option
                      ? "border-brand-500 bg-brand-500/10 text-brand-500"
                      : "border-border bg-surface-raised text-text-secondary"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          </Card>

          {error && (
            <Card className="border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">
              {error}
            </Card>
          )}

          <div className="grid gap-3">
            {loading ? (
              <Card variant="raised" className="p-10 text-center text-text-secondary">
                Loading HTLC status…
              </Card>
            ) : visibleHtlcs.length === 0 ? (
              <EmptyState
                icon={<Activity className="h-7 w-7" />}
                title={htlcs.length === 0 ? "No HTLC activity yet" : "No matching HTLCs"}
                description={
                  htlcs.length === 0
                    ? "No HTLCs are available for the current participant and network context."
                    : "Adjust filters or clear them to view all tracked HTLC locks."
                }
                action={
                  htlcs.length === 0
                    ? { label: "Open Swap", href: "/swap" }
                    : {
                        label: "Clear Filters",
                        variant: "secondary",
                        onClick: () => {
                          setParticipant("");
                          setHashLock("");
                          setStatus("all");
                        },
                      }
                }
              />
            ) : (
              visibleHtlcs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  disabled={optimisticUpdates.has(item.id)}
                  className={cn(
                    "w-full rounded-2xl border p-5 text-left transition-all relative",
                    "bg-surface-raised hover:border-brand-500/40 hover:shadow-glow-sm",
                    selected?.id === item.id
                      ? "border-brand-500/50 shadow-glow-sm"
                      : "border-border",
                    optimisticUpdates.has(item.id) && "opacity-60 pointer-events-none"
                  )}
                >
                  {optimisticUpdates.has(item.id) && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/5 backdrop-blur-sm">
                      <div className="flex flex-col items-center gap-2">
                        <svg
                          className="h-5 w-5 animate-spin text-brand-500"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        <span className="text-xs font-medium text-text-primary">Processing...</span>
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    <div className="grid gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted sm:grid-cols-5">
                      <span>Status</span>
                      <span>Amount</span>
                      <span>Timelock</span>
                      <span>Counterparty</span>
                      <span>Chain</span>
                    </div>

                    <div className="min-w-[140px] text-left md:text-right">
                      <CountdownTimer
                        targetTimestamp={item.time_lock}
                        compact
                        className="border-none bg-transparent px-0 py-0 md:ml-auto"
                      />
                      <p className="mt-1 text-xs text-text-muted">until refund window</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section>
          <Card variant="glass" className="sticky top-24 overflow-hidden">
            {!selected ? (
              <div className="p-6">
                <EmptyState
                  icon={<Search className="h-7 w-7" />}
                  title="Select an HTLC"
                  description="Choose an item from the list to inspect lock details and available claim or refund actions."
                />
              </div>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Selected HTLC
                    </p>
                    <h2 className="mt-2 break-all font-mono text-sm text-text-primary">
                      {selected.id}
                    </h2>
                  </div>
                  <CountdownTimer targetTimestamp={selected.time_lock} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Detail label="Sender" value={selected.sender} />
                  <Detail label="Receiver" value={selected.receiver} />
                  <Detail label="Amount" value={selected.amount.toLocaleString()} />
                  <Detail label="Hash Algorithm" value={selected.hash_algorithm} />
                  <Detail label="Hash Lock" value={selected.hash_lock} />
                  <Detail
                    label="Time Lock"
                    value={new Date(selected.time_lock * 1000).toLocaleString()}
                  />
                </div>

                <ActivityTimeline
                  title="HTLC Activity"
                  events={selectedTimelineEvents}
                  emptyMessage="No HTLC lifecycle events yet."
                />

                <div className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Actions
                  </p>
                  <Input
                    label="Secret"
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder="Required for claim"
                    error={selected.can_claim ? (secretError ?? undefined) : undefined}
                    hint="Enter the 32-byte preimage as a 64-character hex string."
                    disabled={!selected.can_claim}
                  />
                  {claimTx?.lifecycle && (
                    <SigningProgressStepper
                      lifecycle={claimTx.lifecycle}
                      onRetry={
                        claimTx.lifecycle.retryable && isReadyToRetry(claimTx.nextRetryAt)
                          ? () => void handleClaim()
                          : undefined
                      }
                      retryLabel={
                        claimTx.nextRetryAt && !isReadyToRetry(claimTx.nextRetryAt)
                          ? `Retry in ${retryCountdown}s`
                          : "Retry claim"
                      }
                    />
                  )}
                  {claimError && (
                    <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                      <p>{claimError}</p>
                      {claimTx?.retryCount && claimTx.retryCount > 0 && (
                        <p className="mt-2 text-xs text-red-400/80">
                          Attempt {claimTx.retryCount} of 3 •{" "}
                          {isReadyToRetry(claimTx.nextRetryAt)
                            ? "Ready to retry"
                            : `Next retry in ${retryCountdown}s`}
                        </p>
                      )}
                    </div>
                  )}
                  {claimTx?.status === TransactionStatus.COMPLETED && claimExplorerUrl && (
                    <a
                      href={claimExplorerUrl}
                      target={claimExplorerUrl.startsWith("/") ? undefined : "_blank"}
                      rel={claimExplorerUrl.startsWith("/") ? undefined : "noopener noreferrer"}
                      className="inline-flex items-center gap-2 text-sm text-text-primary underline underline-offset-4"
                    >
                      View claim result in explorer
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="flex-1"
                      onClick={() => void handleClaim()}
                      disabled={!selected.can_claim || Boolean(secretError)}
                      loading={actionLoading}
                    >
                      Claim HTLC
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => setRefundTarget(selected)}
                      disabled={!selected.can_refund}
                      loading={actionLoading}
                    >
                      Refund HTLC
                    </Button>
                  </div>
                  <p className="text-xs text-text-muted">
                    Claim and refund requests use the backend API key from
                    `NEXT_PUBLIC_CHAINBRIDGE_API_KEY`.
                  </p>
                </div>
              </div>
            )}
          </Card>
        </section>
      </div>

      <ToastContainer
        toasts={toasts}
        onDismiss={(id) => {
          setToasts((current) => current.filter((toast) => toast.id !== id));
        }}
      />

      <Modal
        open={Boolean(refundTarget)}
        onClose={() => !actionLoading && setRefundTarget(null)}
        title="Confirm HTLC Refund"
        description="Submitting a refund settles the expired lock on Stellar."
      >
        {refundTarget && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-text-secondary">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
                <div>
                  <p className="font-semibold text-text-primary">Finality warning</p>
                  <p className="mt-1">
                    Once the refund transaction confirms, this HTLC will be marked refunded and can
                    no longer be claimed from the dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Detail label="HTLC" value={refundTarget.id} />
              <Detail label="Amount" value={refundTarget.amount.toLocaleString()} />
              <Detail label="Sender" value={refundTarget.sender} />
              <Detail
                label="Expired At"
                value={new Date(refundTarget.time_lock * 1000).toLocaleString()}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                onClick={() => setRefundTarget(null)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                onClick={() => void handleRefund()}
                disabled={!refundTarget.can_refund}
                loading={actionLoading}
              >
                Confirm Refund
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <Card variant="raised" className="p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
        {icon}
        {label}
      </div>
      <div className="mt-3 text-3xl font-black text-text-primary">{value}</div>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{label}</p>
      <p className="mt-2 break-all text-sm text-text-primary">{value}</p>
    </div>
  );
}
