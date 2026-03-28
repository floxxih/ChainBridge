"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button, Input, Badge } from "@/components/ui";
import { Bell, Plus, Trash2, Edit2, ToggleLeft, ToggleRight } from "lucide-react";
import type { Alert, AlertCreate } from "@/lib/adminApi";

interface AlertsPanelProps {
  alerts: Alert[];
  onAdd: (alert: AlertCreate) => Promise<void>;
  onEdit: (id: string, alert: AlertCreate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

const severityStyle: Record<string, string> = {
  info: "bg-brand-500/10 text-brand-400 border-brand-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  critical: "bg-red-500/10 text-red-400 border-red-500/20",
};

const conditionLabels: Record<string, string> = {
  gt: ">",
  lt: "<",
  eq: "=",
};

const METRICS = [
  "active_htlcs",
  "total_htlcs",
  "open_orders",
  "total_orders",
  "total_swaps",
  "swap_volume",
  "blocks_behind",
];

const BLANK_FORM: AlertCreate = {
  name: "",
  metric: "active_htlcs",
  condition: "gt",
  threshold: 0,
  severity: "warning",
  enabled: true,
};

export function AlertsPanel({ alerts, onAdd, onEdit, onDelete, className }: AlertsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AlertCreate>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const openNew = () => {
    setForm(BLANK_FORM);
    setEditId(null);
    setShowForm(true);
  };
  const openEdit = (a: Alert) => {
    setForm({
      name: a.name,
      metric: a.metric,
      condition: a.condition,
      threshold: a.threshold,
      severity: a.severity,
      enabled: a.enabled,
    });
    setEditId(a.id);
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await onEdit(editId, form);
      else await onAdd(form);
      setShowForm(false);
      setEditId(null);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-text-muted" />
          <h3 className="text-sm font-semibold text-text-primary uppercase tracking-wider">
            Alerts
          </h3>
        </div>
        <Button variant="outline" size="sm" onClick={openNew}>
          <Plus className="mr-1 h-3 w-3" /> New
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-xl border border-brand-500/20 bg-surface-raised p-4 flex flex-col gap-3 animate-fade-in">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. High HTLC usage"
          />

          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Metric</label>
              <select
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-ring"
                value={form.metric}
                onChange={(e) => setForm({ ...form, metric: e.target.value })}
              >
                {METRICS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Condition</label>
              <select
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-ring"
                value={form.condition}
                onChange={(e) =>
                  setForm({ ...form, condition: e.target.value as "gt" | "lt" | "eq" })
                }
              >
                <option value="gt">Greater than</option>
                <option value="lt">Less than</option>
                <option value="eq">Equal to</option>
              </select>
            </div>
            <Input
              label="Threshold"
              type="number"
              value={String(form.threshold)}
              onChange={(e) => setForm({ ...form, threshold: Number(e.target.value) })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-text-secondary">Severity</label>
              <select
                className="rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-ring"
                value={form.severity}
                onChange={(e) =>
                  setForm({ ...form, severity: e.target.value as "info" | "warning" | "critical" })
                }
              >
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div className="flex items-end pb-0.5">
              <button
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary"
                onClick={() => setForm({ ...form, enabled: !form.enabled })}
              >
                {form.enabled ? (
                  <ToggleRight className="h-5 w-5 text-emerald-400" />
                ) : (
                  <ToggleLeft className="h-5 w-5 text-text-muted" />
                )}
                {form.enabled ? "Enabled" : "Disabled"}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={save} disabled={!form.name || saving}>
              {saving ? "Saving…" : editId ? "Update" : "Create"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowForm(false);
                setEditId(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Alert list */}
      {alerts.length === 0 && !showForm && (
        <p className="text-sm text-text-muted py-6 text-center">No alerts configured</p>
      )}

      <div className="flex flex-col gap-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-border bg-surface-raised px-4 py-3 flex items-center gap-3"
          >
            <Badge className={cn("shrink-0", severityStyle[a.severity])}>{a.severity}</Badge>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
              <p className="text-xs text-text-muted">
                {a.metric} {conditionLabels[a.condition] ?? a.condition} {a.threshold}
              </p>
            </div>
            <span
              className={cn(
                "text-[10px] font-medium",
                a.enabled ? "text-emerald-400" : "text-text-muted"
              )}
            >
              {a.enabled ? "ON" : "OFF"}
            </span>
            <button
              onClick={() => openEdit(a)}
              className="text-text-muted hover:text-brand-400 transition-colors"
              aria-label="Edit"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(a.id)}
              className="text-text-muted hover:text-red-400 transition-colors"
              aria-label="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
