"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button, Input, Badge } from "@/components/ui";
import {
  Bell,
  Plus,
  Trash2,
  Edit2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { Alert, AlertCreate } from "@/lib/adminApi";

/* -------------------------------------------------------------------------- */
/*                                   CONFIG                                   */
/* -------------------------------------------------------------------------- */

const METRICS = [
  "active_htlcs",
  "total_htlcs",
  "open_orders",
  "total_orders",
  "total_swaps",
  "swap_volume",
  "blocks_behind",
  "swap_time_remaining", // NEW
];

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

const BLANK_FORM: AlertCreate = {
  name: "",
  metric: "active_htlcs",
  condition: "gt",
  threshold: 0,
  severity: "warning",
  enabled: true,
};

/* -------------------------------------------------------------------------- */
/*                                   TYPES                                    */
/* -------------------------------------------------------------------------- */

type Swap = {
  id: string;
  timeRemaining: number; // seconds
};

/* -------------------------------------------------------------------------- */
/*                              WARNING BANNER                                */
/* -------------------------------------------------------------------------- */

function SwapWarningBanner({
  alert,
  onDismiss,
}: {
  alert: Alert;
  onDismiss: () => void;
}) {
  return (
    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-center justify-between animate-fade-in">
      <div>
        <p className="text-sm font-medium text-amber-300">{alert.name}</p>
        <p className="text-xs text-amber-200/80">
          Swap is approaching timeout ({alert.threshold}s)
        </p>
      </div>

      <div className="flex items-center gap-2">
        {alert.cta && (
          <a href={alert.cta.href}>
            <Button size="sm" variant="outline">
              {alert.cta.label}
            </Button>
          </a>
        )}
        <Button size="sm" onClick={onDismiss}>
          Dismiss
        </Button>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                              MAIN COMPONENT                                */
/* -------------------------------------------------------------------------- */

interface AlertsPanelProps {
  alerts: Alert[];
  swaps: Swap[]; // NEW
  onAdd: (alert: AlertCreate) => Promise<void>;
  onEdit: (id: string, alert: AlertCreate) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  className?: string;
}

export function AlertsPanel({
  alerts,
  swaps,
  onAdd,
  onEdit,
  onDelete,
  className,
}: AlertsPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<AlertCreate>(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  // alertId -> last triggered timestamp
  const [activeWarnings, setActiveWarnings] = useState<
    Record<string, number>
  >({});

  /* ----------------------------- FORM HANDLING ----------------------------- */

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
      // optional fields preserved if present
      ...(a.cooldownSeconds && { cooldownSeconds: a.cooldownSeconds }),
      ...(a.cta && { cta: a.cta }),
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

  /* --------------------------- ALERT EVALUATION ---------------------------- */

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();

      alerts.forEach((alert) => {
        if (!alert.enabled || alert.metric !== "swap_time_remaining") return;

        const triggered = swaps.some((s) => {
          if (alert.condition === "lt") return s.timeRemaining < alert.threshold;
          if (alert.condition === "gt") return s.timeRemaining > alert.threshold;
          return s.timeRemaining === alert.threshold;
        });

        if (!triggered) return;

        const last = activeWarnings[alert.id];
        const cooldown = (alert.cooldownSeconds ?? 60) * 1000;

        if (!last || now - last > cooldown) {
          setActiveWarnings((prev) => ({
            ...prev,
            [alert.id]: now,
          }));
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [alerts, swaps, activeWarnings]);

  /* -------------------------------------------------------------------------- */
  /*                                   RENDER                                   */
  /* -------------------------------------------------------------------------- */

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {/* HEADER */}
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

      {/* WARNING BANNERS */}
      {Object.keys(activeWarnings).map((id) => {
        const alert = alerts.find((a) => a.id === id);
        if (!alert) return null;

        return (
          <SwapWarningBanner
            key={id}
            alert={alert}
            onDismiss={() =>
              setActiveWarnings((prev) => {
                const copy = { ...prev };
                delete copy[id];
                return copy;
              })
            }
          />
        );
      })}

      {/* FORM */}
      {showForm && (
        <div className="rounded-xl border border-brand-500/20 bg-surface-raised p-4 flex flex-col gap-3 animate-fade-in">
          <Input
            label="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <div className="grid grid-cols-3 gap-3">
            <select
              value={form.metric}
              onChange={(e) => setForm({ ...form, metric: e.target.value })}
              className="input"
            >
              {METRICS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>

            <select
              value={form.condition}
              onChange={(e) =>
                setForm({
                  ...form,
                  condition: e.target.value as "gt" | "lt" | "eq",
                })
              }
              className="input"
            >
              <option value="gt">Greater than</option>
              <option value="lt">Less than</option>
              <option value="eq">Equal</option>
            </select>

            <Input
              type="number"
              value={String(form.threshold)}
              onChange={(e) =>
                setForm({ ...form, threshold: Number(e.target.value) })
              }
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={!form.name || saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button
              variant="outline"
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

      {/* EMPTY */}
      {alerts.length === 0 && !showForm && (
        <p className="text-sm text-text-muted py-6 text-center">
          No alerts configured
        </p>
      )}

      {/* LIST */}
      <div className="flex flex-col gap-2">
        {alerts.map((a) => (
          <div
            key={a.id}
            className="rounded-xl border border-border bg-surface-raised px-4 py-3 flex items-center gap-3"
          >
            <Badge className={cn(severityStyle[a.severity])}>
              {a.severity}
            </Badge>

            <div className="flex-1">
              <p className="text-sm font-medium">{a.name}</p>
              <p className="text-xs text-text-muted">
                {a.metric} {conditionLabels[a.condition]} {a.threshold}
              </p>
            </div>

            <span
              className={cn(
                "text-xs",
                a.enabled ? "text-emerald-400" : "text-muted"
              )}
            >
              {a.enabled ? "ON" : "OFF"}
            </span>

            <Edit2
              className="h-4 w-4 cursor-pointer"
              onClick={() => openEdit(a)}
            />
            <Trash2
              className="h-4 w-4 cursor-pointer"
              onClick={() => onDelete(a.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}