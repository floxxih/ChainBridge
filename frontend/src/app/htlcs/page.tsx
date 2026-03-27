"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  ArrowRightLeft,
  Clock3,
  RefreshCw,
  Search,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

import { Button, Card, Input, ToastContainer } from "@/components/ui";
import { claimHTLC, fetchHTLCs, HTLCRecord, refundHTLC } from "@/lib/htlcApi";
import { cn } from "@/lib/utils";

type ToastMessage = {
  id: string;
  title: string;
  message?: string;
  type?: "success" | "error" | "info";
};

const STATUS_OPTIONS = ["all", "active", "claimed", "refunded"];

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
  if (value.length <= 16) return value;
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
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
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  async function loadHTLCs(showSpinner = true) {
    if (showSpinner) setLoading(true);
    setRefreshing(!showSpinner);
    setError(null);
    try {
      const data = await fetchHTLCs({
        participant: participant.trim() || undefined,
        hash_lock: hashLock.trim() || undefined,
        status: status === "all" ? undefined : status,
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
  }

  useEffect(() => {
    void loadHTLCs();
  }, [status]);

  const selected = htlcs.find((item) => item.id === selectedId) ?? htlcs[0] ?? null;

  const enriched = htlcs.map((item) => {
    const secondsRemaining = Math.max(item.time_lock - now, 0);
    return {
      ...item,
      secondsRemaining,
      urgency: secondsRemaining === 0 ? "critical" : secondsRemaining < 3600 ? "warning" : "normal",
    };
  });

  const activeCount = enriched.filter((item) => item.status === "active").length;
  const claimableCount = enriched.filter((item) => item.can_claim).length;
  const refundableCount = enriched.filter((item) => item.can_refund).length;

  function pushToast(toast: Omit<ToastMessage, "id">) {
    setToasts((current) => [...current, { id: `${Date.now()}-${Math.random()}`, ...toast }]);
  }

  async function handleClaim() {
    if (!selected || !secret.trim()) return;
    setActionLoading(true);
    try {
      await claimHTLC(selected.id, secret.trim());
      pushToast({
        type: "success",
        title: "HTLC claimed",
        message: `Secret submitted for ${selected.id}.`,
      });
      setSecret("");
      await loadHTLCs(false);
    } catch (claimError: any) {
      pushToast({
        type: "error",
        title: "Claim failed",
        message:
          claimError?.response?.data?.detail ??
          "Set NEXT_PUBLIC_CHAINBRIDGE_API_KEY to enable claim actions.",
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRefund() {
    if (!selected) return;
    setActionLoading(true);
    try {
      await refundHTLC(selected.id);
      pushToast({
        type: "success",
        title: "Refund submitted",
        message: `Refund queued for ${selected.id}.`,
      });
      await loadHTLCs(false);
    } catch (refundError: any) {
      pushToast({
        type: "error",
        title: "Refund failed",
        message:
          refundError?.response?.data?.detail ??
          "Set NEXT_PUBLIC_CHAINBRIDGE_API_KEY to enable refund actions.",
      });
    } finally {
      setActionLoading(false);
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
            ) : enriched.length === 0 ? (
              <Card variant="raised" className="p-10 text-center text-text-secondary">
                No HTLCs match the current filters.
              </Card>
            ) : (
              enriched.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSelectedId(item.id)}
                  className={cn(
                    "w-full rounded-2xl border p-5 text-left transition-all",
                    "bg-surface-raised hover:border-brand-500/40 hover:shadow-glow-sm",
                    selected?.id === item.id
                      ? "border-brand-500/50 shadow-glow-sm"
                      : "border-border"
                  )}
                >
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          {item.status}
                        </span>
                        <span className="text-sm font-semibold text-text-primary">
                          {item.phase}
                        </span>
                      </div>
                      <p className="font-mono text-sm text-text-primary">{item.id}</p>
                      <div className="grid gap-1 text-sm text-text-secondary sm:grid-cols-2">
                        <span>Sender: {shortAddress(item.sender)}</span>
                        <span>Receiver: {shortAddress(item.receiver)}</span>
                        <span>Amount: {item.amount.toLocaleString()}</span>
                        <span>Hash: {shortAddress(item.hash_lock)}</span>
                      </div>
                    </div>

                    <div className="min-w-[140px] text-left md:text-right">
                      <div
                        className={cn(
                          "text-sm font-bold",
                          item.urgency === "critical"
                            ? "text-red-400"
                            : item.urgency === "warning"
                              ? "text-amber-400"
                              : "text-emerald-400"
                        )}
                      >
                        {formatRemaining(item.secondsRemaining)}
                      </div>
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
              <div className="p-10 text-center text-text-secondary">
                Select an HTLC to inspect its current state.
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
                  <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                    <Clock3 className="h-4 w-4 text-brand-500" />
                    {formatRemaining(Math.max(selected.time_lock - now, 0))}
                  </div>
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

                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                      Timeline
                    </p>
                  </div>
                  <div className="space-y-3">
                    {selected.timeline.map((event) => (
                      <div key={event.label} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <span
                            className={cn(
                              "mt-1 h-3 w-3 rounded-full border",
                              event.completed
                                ? "border-brand-500 bg-brand-500"
                                : "border-border bg-surface"
                            )}
                          />
                          <span className="mt-1 h-full w-px bg-border" />
                        </div>
                        <div className="pb-3">
                          <p className="text-sm font-semibold text-text-primary">{event.label}</p>
                          <p className="text-xs text-text-secondary">
                            {event.timestamp
                              ? new Date(event.timestamp).toLocaleString()
                              : "Pending"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 rounded-2xl border border-border bg-surface-raised p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Actions
                  </p>
                  <Input
                    label="Secret"
                    value={secret}
                    onChange={(event) => setSecret(event.target.value)}
                    placeholder="Required for claim"
                    disabled={!selected.can_claim}
                  />
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="flex-1"
                      onClick={() => void handleClaim()}
                      disabled={!selected.can_claim || secret.trim().length === 0}
                      loading={actionLoading}
                    >
                      Claim HTLC
                    </Button>
                    <Button
                      className="flex-1"
                      variant="outline"
                      onClick={() => void handleRefund()}
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
