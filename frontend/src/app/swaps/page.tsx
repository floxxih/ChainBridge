"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, Badge, Button, EmptyState, Modal, Input } from "@/components/ui";
import { History, ExternalLink, ArrowRight, Filter } from "lucide-react";
import { SwapStatus } from "@/types";
import { createDispute } from "@/lib/disputesApi";
import { useMockSwaps, useSwapHistoryStore } from "@/hooks/useSwapHistory";
import { useUnifiedWallet } from "@/components/wallet/UnifiedWalletProvider";

export default function HistoryPage() {
  const { isConnected, activeAddress: address } = useUnifiedWallet();
  const swaps = useSwapHistoryStore((state) => state.swaps);
  const { seedMockSwaps } = useMockSwaps();

  const [open, setOpen] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<string>("");
  const [category, setCategory] = useState("timeout");
  const [priority, setPriority] = useState("normal");
  const [reason, setReason] = useState("");
  const [evidence, setEvidence] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    seedMockSwaps();
  }, [seedMockSwaps]);

  const disputableSwaps = useMemo(
    () =>
      swaps.filter((swap) => swap.status === SwapStatus.PENDING || swap.status === SwapStatus.EXPIRED),
    [swaps]
  );

  const submitDispute = async () => {
    if (!selectedSwap || !reason.trim() || !address) return;
    setSubmitting(true);
    setStatusMessage(null);
    try {
      await createDispute({
        swap_id: selectedSwap,
        submitted_by: address,
        category: category as any,
        reason: reason.trim(),
        priority: priority as any,
        evidence: evidence.trim() ? [{ type: "note", value: evidence.trim() }] : [],
      });
      setStatusMessage("Dispute submitted successfully. Admin review has been queued.");
      setReason("");
      setEvidence("");
      setOpen(false);
    } catch (err: any) {
      setStatusMessage(err?.response?.data?.detail ?? "Failed to submit dispute");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20 animate-fade-in">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay border border-border font-bold text-text-primary">
            <History className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Swap History</h1>
            <p className="mt-1 text-sm text-text-secondary">
              Track and manage your cross-chain atomic swaps.
            </p>
          </div>
        </div>
        <Button variant="secondary" size="sm" icon={<Filter className="h-4 w-4" />}>
          Filter
        </Button>
      </div>

      {!isConnected ? (
        <EmptyState
          icon={<History className="h-7 w-7" />}
          title="Connect your wallet"
          description="Connect a wallet to load and monitor your swap history in real time."
          action={{ label: "Open Swap", href: "/swap" }}
        />
      ) : (
        <div className="space-y-4">
          {statusMessage && <Card className="p-3 text-sm text-text-secondary">{statusMessage}</Card>}

          {swaps.length === 0 ? (
            <EmptyState
              icon={<History className="h-7 w-7" />}
              title="No swaps yet"
              description="You have no historical swaps on this profile. Start with a new cross-chain swap to populate activity here."
              action={{ label: "Start Swap", href: "/swap" }}
            />
          ) : (
            swaps.map((swap) => (
              <Card key={swap.id} hover className="flex items-center justify-between overflow-hidden p-6">
                <div className="flex items-center gap-6">
                  <div className="flex -space-x-2">
                    <div className="h-10 w-10 rounded-full border-2 border-background bg-surface flex items-center justify-center text-xs font-bold">
                      {swap.from}
                    </div>
                    <div className="h-10 w-10 rounded-full border-2 border-background bg-surface flex items-center justify-center text-xs font-bold">
                      {swap.to}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">
                        {swap.amount} {swap.from}
                      </span>
                      <ArrowRight className="h-3 w-3 text-text-muted" />
                      <span className="font-bold text-text-primary">
                        {swap.toAmount} {swap.to}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-1">
                      {new Date(swap.date).toLocaleDateString()} at{" "}
                      {new Date(swap.date).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <Badge status={swap.status} />
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled={!swap.otherChainTx}>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  {(swap.status === SwapStatus.PENDING || swap.status === SwapStatus.EXPIRED) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedSwap(swap.id);
                        setOpen(true);
                      }}
                    >
                      Open Dispute
                    </Button>
                  )}
                </div>
              </Card>
            ))
          )}

          {swaps.length > 0 ? (
            <div className="pt-6 text-center">
              <p className="text-xs text-text-muted">Showing {swaps.length} recent swaps</p>
            </div>
          ) : null}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Submit Swap Dispute"
        description="Provide evidence and context for manual review."
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Swap</label>
            <select
              value={selectedSwap}
              onChange={(e) => setSelectedSwap(e.target.value)}
              className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
            >
              <option value="">Select swap</option>
              {disputableSwaps.map((swap) => (
                <option key={swap.id} value={swap.id}>
                  {swap.id} ({swap.from} to {swap.to})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
              >
                <option value="timeout">Timeout</option>
                <option value="incorrect_amount">Incorrect Amount</option>
                <option value="counterparty_unresponsive">Counterparty Unresponsive</option>
                <option value="proof_failure">Proof Failure</option>
                <option value="chain_reorg">Chain Reorg</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-[110px] rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
              placeholder="Describe what happened and why manual intervention is needed"
            />
          </div>

          <Input
            label="Evidence (optional)"
            value={evidence}
            onChange={(e) => setEvidence(e.target.value)}
            placeholder="Tx hash, explorer URL, or additional notes"
          />

          <Button
            onClick={submitDispute}
            disabled={submitting || !selectedSwap || reason.trim().length < 10}
          >
            {submitting ? "Submitting..." : "Submit Dispute"}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
