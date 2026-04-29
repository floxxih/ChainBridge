"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ActivityTimeline,
  type ActivityTimelineEvent,
} from "@/components/timeline/ActivityTimeline";
import { Badge, Button, Card, EmptyState, InlineError } from "@/components/ui";
import { getExplorerUrl } from "@/lib/explorers";
import { cn } from "@/lib/utils";
import { AlertTriangle, ArrowRight, ExternalLink, History, Link2, RefreshCw } from "lucide-react";
import { SwapStatus } from "@/types";
import { useMockSwaps, useSwapHistoryStore } from "@/hooks/useSwapHistory";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";
import { PageHeader } from "@/components/layout/PageHeader";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

type TimelineStepKey = "initiated" | "source_locked" | "destination_locked" | "settled";

const TIMELINE_STEPS: Array<{ key: TimelineStepKey; label: string; chain: string }> = [
  { key: "initiated", label: "Swap initiated", chain: "Protocol" },
  { key: "source_locked", label: "Source lock created", chain: "Source chain" },
  { key: "destination_locked", label: "Destination lock created", chain: "Destination chain" },
  { key: "settled", label: "Settlement", chain: "Protocol" },
];

function getSettledIndex(status: SwapStatus): number {
  switch (status) {
    case SwapStatus.PENDING:
      return 0;
    case SwapStatus.LOCKED_INITIATOR:
      return 1;
    case SwapStatus.LOCKED_RESPONDER:
      return 2;
    case SwapStatus.COMPLETED:
    case SwapStatus.CANCELLED:
    case SwapStatus.EXPIRED:
      return 3;
    default:
      return 0;
  }
}

function buildTimeline(
  swapId: string,
  status: SwapStatus,
  createdAt: string,
  otherChainTx?: string
): ActivityTimelineEvent[] {
  const progress = getSettledIndex(status);
  const endedInFailure = status === SwapStatus.CANCELLED || status === SwapStatus.EXPIRED;

  return TIMELINE_STEPS.map((step, index) => {
    let eventStatus: ActivityTimelineEvent["status"] = "pending";
    if (index < progress) eventStatus = "confirmed";
    if (index === progress && !endedInFailure) eventStatus = "confirmed";
    if (index === progress && endedInFailure) eventStatus = "failed";

    let description = "Awaiting next lifecycle confirmation.";
    if (index === 3 && status === SwapStatus.COMPLETED) {
      description = "Assets were redeemed successfully on both chains.";
    } else if (index === 3 && endedInFailure) {
      description = "Swap ended without settlement. Funds can be reclaimed per timelock rules.";
    }

    return {
      id: `${swapId}-${step.key}`,
      label: step.label,
      chain: step.chain,
      status: eventStatus,
      timestamp: index <= progress ? createdAt : null,
      txHash: index >= 1 && otherChainTx ? otherChainTx : undefined,
      href: index >= 1 && otherChainTx ? getExplorerUrl("ethereum", otherChainTx) : undefined,
      description,
    };
  });
}

function formatStatusLabel(status: SwapStatus): string {
  return status.replaceAll("_", " ");
}

function getBadgeVariant(status: ActivityTimelineEvent["status"]): "error" | "success" | "info" {
  if (status === "failed") return "error";
  if (status === "confirmed") return "success";
  return "info";
}

export default function TrackSwapsPage() {
  const { isConnected, activeAddress: address } = useUnifiedWallet();
  const swaps = useSwapHistoryStore((state) => state.swaps);
  const { seedMockSwaps } = useMockSwaps();
  const breadcrumbs = useBreadcrumbs();

  const [selectedSwapId, setSelectedSwapId] = useState<string>("");

  useEffect(() => {
    seedMockSwaps();
  }, [seedMockSwaps]);

  useEffect(() => {
    if (!selectedSwapId && swaps.length > 0) {
      setSelectedSwapId(swaps[0].id);
    }
  }, [selectedSwapId, swaps]);

  const selectedSwap = useMemo(
    () => swaps.find((swap) => swap.id === selectedSwapId),
    [selectedSwapId, swaps]
  );

  const timelineEvents = useMemo(() => {
    if (!selectedSwap) return [];
    return buildTimeline(
      selectedSwap.id,
      selectedSwap.status,
      selectedSwap.date,
      selectedSwap.otherChainTx
    );
  }, [selectedSwap]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Track Swaps"
        subtitle="Monitor lifecycle status, timeline events, and transaction links for each swap"
        breadcrumbs={breadcrumbs}
        primaryAction={
          <Button variant="secondary" size="sm" icon={<RefreshCw className="h-4 w-4" />} onClick={seedMockSwaps}>
            Refresh
          </Button>
        }
      />

      {!isConnected ? (
        <EmptyState
          icon={<History className="h-7 w-7" />}
          title="Connect your wallet"
          description="Connect a wallet to load and monitor your swap history in real time."
          action={{ label: "Open Swap", href: "/swap" }}
        />
      ) : (
        <>
          {swaps.length === 0 && (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No swaps yet"
              description="You have no historical swaps on this profile. Start with a new cross-chain swap to populate activity here."
              action={{ label: "Start Swap", href: "/swap" }}
            />
          )}

          {swaps.length > 0 && (
            <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
              <section className="space-y-6">
                <Card className="p-5">
                  <label
                    htmlFor="swap-select"
                    className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-text-muted"
                  >
                    Select swap
                  </label>
                  <select
                    id="swap-select"
                    value={selectedSwapId}
                    onChange={(event) => setSelectedSwapId(event.target.value)}
                    className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
                    aria-label="Select swap to track"
                  >
                    {swaps.map((swap) => (
                      <option key={swap.id} value={swap.id}>
                        {swap.id} · {swap.from} to {swap.to}
                      </option>
                    ))}
                  </select>
                </Card>

                {!selectedSwap ? (
                  <InlineError
                    kind="generic"
                    error="Unable to load the selected swap details."
                    onRetry={() => {
                      if (swaps[0]) setSelectedSwapId(swaps[0].id);
                    }}
                  />
                ) : (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Card className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Current status
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge status={selectedSwap.status} />
                          <span className="text-sm capitalize text-text-secondary">
                            {formatStatusLabel(selectedSwap.status)}
                          </span>
                        </div>
                      </Card>
                      <Card className="p-5">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                          Route
                        </p>
                        <div className="mt-2 flex items-center gap-2 font-semibold text-text-primary">
                          <span>{selectedSwap.from}</span>
                          <ArrowRight className="h-4 w-4 text-text-muted" />
                          <span>{selectedSwap.to}</span>
                        </div>
                        <p className="mt-2 text-sm text-text-secondary">
                          {selectedSwap.amount} {selectedSwap.from} to {selectedSwap.toAmount}{" "}
                          {selectedSwap.to}
                        </p>
                      </Card>
                    </div>

                    <Card className="p-5">
                      <ActivityTimeline
                        title="Status timeline"
                        events={timelineEvents}
                        emptyMessage="Timeline data is not available for this swap yet."
                      />
                    </Card>
                  </>
                )}
              </section>

              <aside className="space-y-6">
                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Event cards
                  </p>
                  <div className="mt-4 space-y-3">
                    {timelineEvents.map((event) => (
                      <div
                        key={event.id}
                        className={cn(
                          "rounded-xl border p-3",
                          event.status === "confirmed" && "border-emerald-500/20 bg-emerald-500/5",
                          event.status === "pending" && "border-border bg-surface-raised",
                          event.status === "failed" && "border-red-500/20 bg-red-500/5"
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-text-primary">{event.label}</p>
                          <Badge variant={getBadgeVariant(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-text-secondary">
                          {event.timestamp
                            ? new Date(event.timestamp).toLocaleString()
                            : "Waiting for update"}
                        </p>
                      </div>
                    ))}
                  </div>
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Transaction links
                  </p>
                  {!selectedSwap?.otherChainTx ? (
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-border bg-surface-raised p-3 text-sm text-text-secondary">
                      <AlertTriangle className="mt-0.5 h-4 w-4 text-text-muted" />
                      <p>No external transaction hash is available yet for this swap.</p>
                    </div>
                  ) : (
                    <div className="mt-4 space-y-3">
                      <a
                        href={getExplorerUrl("ethereum", selectedSwap.otherChainTx)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary hover:border-brand-500/40"
                      >
                        <span className="inline-flex items-center gap-2">
                          <Link2 className="h-4 w-4 text-text-muted" />
                          Destination chain transaction
                        </span>
                        <ExternalLink className="h-4 w-4 text-text-muted" />
                      </a>
                    </div>
                  )}
                </Card>

                <Card className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
                    Tracking context
                  </p>
                  <p className="mt-2 text-sm text-text-secondary">
                    Wallet: {address ?? "Not available"}
                  </p>
                  <p className="mt-1 text-sm text-text-secondary">Swaps in view: {swaps.length}</p>
                </Card>
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
