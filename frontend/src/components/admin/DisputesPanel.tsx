"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Badge, Button, Input } from "@/components/ui";
import type { Dispute, DisputeResolveRequest, DisputeStats } from "@/lib/adminApi";
import { AlertOctagon, CheckCircle2, CircleDashed, Gavel, ShieldAlert } from "lucide-react";

interface DisputesPanelProps {
  disputes: Dispute[];
  stats: DisputeStats | null;
  onReview: (id: string, reviewedBy: string, adminNotes: string) => Promise<void>;
  onResolve: (id: string, payload: DisputeResolveRequest) => Promise<void>;
  className?: string;
}

const statusStyle: Record<string, string> = {
  submitted: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  in_review: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  refunded: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
};

export function DisputesPanel({
  disputes,
  stats,
  onReview,
  onResolve,
  className,
}: DisputesPanelProps) {
  const [reviewTarget, setReviewTarget] = useState<string | null>(null);
  const [resolveTarget, setResolveTarget] = useState<string | null>(null);
  const [reviewedBy, setReviewedBy] = useState("admin");
  const [resolvedBy, setResolvedBy] = useState("admin");
  const [adminNotes, setAdminNotes] = useState("");
  const [resolution, setResolution] = useState("");
  const [resolutionAction, setResolutionAction] =
    useState<DisputeResolveRequest["resolution_action"]>("approve");
  const [status, setStatus] = useState<DisputeResolveRequest["status"]>("resolved");
  const [refundOverride, setRefundOverride] = useState(false);
  const [refundAmount, setRefundAmount] = useState("0");
  const [saving, setSaving] = useState(false);

  const openDisputes = useMemo(
    () => disputes.filter((d) => d.status === "submitted" || d.status === "in_review"),
    [disputes]
  );

  const handleReview = async (id: string) => {
    if (!adminNotes.trim()) return;
    setSaving(true);
    try {
      await onReview(id, reviewedBy.trim() || "admin", adminNotes.trim());
      setReviewTarget(null);
      setAdminNotes("");
    } finally {
      setSaving(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!resolution.trim()) return;
    setSaving(true);
    try {
      await onResolve(id, {
        status,
        resolution_action: resolutionAction,
        resolution,
        admin_notes: adminNotes || undefined,
        resolved_by: resolvedBy.trim() || "admin",
        refund_override: refundOverride,
        refund_amount: refundOverride ? Number(refundAmount) : undefined,
      });
      setResolveTarget(null);
      setResolution("");
      setAdminNotes("");
      setRefundOverride(false);
      setRefundAmount("0");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gavel className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Disputes
          </h3>
        </div>
        {stats && (
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Total: {stats.total}</span>
            <span>Open: {stats.submitted + stats.in_review}</span>
            <span>Resolved: {stats.resolved + stats.refunded}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
        <MiniStat
          label="Submitted"
          value={stats?.submitted ?? 0}
          icon={<AlertOctagon className="h-3 w-3" />}
        />
        <MiniStat
          label="In Review"
          value={stats?.in_review ?? 0}
          icon={<CircleDashed className="h-3 w-3" />}
        />
        <MiniStat
          label="Resolved"
          value={stats?.resolved ?? 0}
          icon={<CheckCircle2 className="h-3 w-3" />}
        />
        <MiniStat
          label="Rejected"
          value={stats?.rejected ?? 0}
          icon={<ShieldAlert className="h-3 w-3" />}
        />
        <MiniStat
          label="Refunded"
          value={stats?.refunded ?? 0}
          icon={<CheckCircle2 className="h-3 w-3" />}
        />
      </div>

      {openDisputes.length === 0 && (
        <p className="text-sm text-text-muted py-6 text-center">No active disputes</p>
      )}

      <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
        {openDisputes.map((d) => (
          <div
            key={d.id}
            className="rounded-xl border border-border bg-surface-raised p-4 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">
                  {d.category.replace(/_/g, " ")}
                </p>
                <p className="text-xs font-mono text-text-muted truncate">Swap: {d.swap_id}</p>
              </div>
              <Badge className={statusStyle[d.status] ?? statusStyle.submitted}>{d.status}</Badge>
            </div>

            <p className="text-sm text-text-secondary line-clamp-2">{d.reason}</p>
            <p className="text-xs text-text-muted">Evidence items: {d.evidence?.length ?? 0}</p>

            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReviewTarget(d.id);
                  setResolveTarget(null);
                }}
              >
                Start Review
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setResolveTarget(d.id);
                  setReviewTarget(null);
                }}
              >
                Resolve
              </Button>
            </div>

            {reviewTarget === d.id && (
              <div className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-3">
                <Input
                  label="Reviewer"
                  value={reviewedBy}
                  onChange={(e) => setReviewedBy(e.target.value)}
                />
                <Input
                  label="Review Notes"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />
                <Button
                  size="sm"
                  onClick={() => handleReview(d.id)}
                  disabled={saving || !adminNotes.trim()}
                >
                  {saving ? "Saving…" : "Mark In Review"}
                </Button>
              </div>
            )}

            {resolveTarget === d.id && (
              <div className="rounded-lg border border-border bg-surface p-3 flex flex-col gap-3">
                <Input
                  label="Resolver"
                  value={resolvedBy}
                  onChange={(e) => setResolvedBy(e.target.value)}
                />

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">
                      Resolution Status
                    </label>
                    <select
                      className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as DisputeResolveRequest["status"])}
                    >
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                      <option value="refunded">Refunded</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-text-secondary">Action</label>
                    <select
                      className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
                      value={resolutionAction}
                      onChange={(e) =>
                        setResolutionAction(
                          e.target.value as DisputeResolveRequest["resolution_action"]
                        )
                      }
                    >
                      <option value="approve">Approve</option>
                      <option value="reject">Reject</option>
                      <option value="refund_override">Refund Override</option>
                      <option value="manual_settlement">Manual Settlement</option>
                    </select>
                  </div>
                </div>

                <Input
                  label="Resolution Summary"
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                />
                <Input
                  label="Admin Notes (optional)"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                />

                <label className="flex items-center gap-2 text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    checked={refundOverride}
                    onChange={(e) => setRefundOverride(e.target.checked)}
                  />
                  Apply refund override
                </label>

                {refundOverride && (
                  <Input
                    label="Refund Amount"
                    type="number"
                    min="0"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                  />
                )}

                <Button
                  size="sm"
                  onClick={() => handleResolve(d.id)}
                  disabled={saving || !resolution.trim()}
                >
                  {saving ? "Saving…" : "Finalize Resolution"}
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-text-primary flex items-center gap-1">
        {icon} {value}
      </p>
    </div>
  );
}
