"use client";

import { BellRing, MonitorCog, Network, RotateCcw, Settings2 } from "lucide-react";
import { Badge, Breadcrumb, Button, Card } from "@/components/ui";
import { defaultSettings, useSettingsStore } from "@/hooks/useSettings";
import { useToast } from "@/hooks/useToast";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";

export default function SettingsPage() {
  const { settings, updateDisplay, updateNotifications, updateNetwork, resetSettings } =
    useSettingsStore();
  const { success } = useToast();
  const breadcrumbs = useBreadcrumbs();

  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
      {/* Breadcrumb Navigation */}
      <div className="mb-6">
        <Breadcrumb items={breadcrumbs} />
      </div>
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-brand-500/20 bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-500">
            <Settings2 className="h-3.5 w-3.5" />
            Preferences
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary sm:text-5xl">
            Settings
          </h1>
          <p className="mt-3 max-w-2xl text-base text-text-secondary">
            Configure display behavior, realtime notifications, and preferred network mode. Changes
            apply instantly.
          </p>
        </div>

        <Button
          variant="secondary"
          icon={<RotateCcw className="h-4 w-4" />}
          onClick={() => {
            resetSettings();
            success("Settings reset", "All preferences are restored to defaults.");
          }}
        >
          Reset to Defaults
        </Button>
      </div>

      <div className="space-y-5">
        <Card variant="raised" className="p-6">
          <SectionHeader
            title="Display"
            description="Theme and density preferences for the interface."
            icon={<MonitorCog className="h-4 w-4 text-brand-500" />}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">Theme</span>
              <select
                value={settings.display.theme}
                onChange={(event) =>
                  updateDisplay({
                    theme: event.target.value as "system" | "light" | "dark",
                  })
                }
                className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                <option value="system">System</option>
                <option value="dark">Dark</option>
                <option value="light">Light</option>
              </select>
            </label>

            <ToggleRow
              label="Compact mode"
              description="Reduce spacing across dashboards and cards."
              checked={settings.display.compactMode}
              onToggle={() =>
                updateDisplay({
                  compactMode: !settings.display.compactMode,
                })
              }
            />
          </div>
        </Card>

        <Card variant="raised" className="p-6">
          <SectionHeader
            title="Notifications"
            description="Control how live events are surfaced."
            icon={<BellRing className="h-4 w-4 text-amber-400" />}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <ToggleRow
              label="Realtime toasts"
              description="Show toast updates for incoming order/swap/HTLC events."
              checked={settings.notifications.realtimeToasts}
              onToggle={() =>
                updateNotifications({
                  realtimeToasts: !settings.notifications.realtimeToasts,
                })
              }
            />
            <ToggleRow
              label="Sound alerts"
              description="Play a short sound for high-priority events."
              checked={settings.notifications.soundEnabled}
              onToggle={() =>
                updateNotifications({
                  soundEnabled: !settings.notifications.soundEnabled,
                })
              }
            />
          </div>
        </Card>

        <Card variant="raised" className="p-6">
          <SectionHeader
            title="Network"
            description="Choose the default environment for protocol interactions."
            icon={<Network className="h-4 w-4 text-emerald-400" />}
          />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-text-secondary">Network mode</span>
              <select
                value={settings.network.mode}
                onChange={(event) =>
                  updateNetwork({
                    mode: event.target.value as "testnet" | "mainnet",
                  })
                }
                className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm text-text-primary"
              >
                <option value="testnet">Testnet</option>
                <option value="mainnet">Mainnet</option>
              </select>
            </label>

            <ToggleRow
              label="Live WebSocket updates"
              description="Keep realtime connection active for orders, swaps, and HTLCs."
              checked={settings.network.liveUpdates}
              onToggle={() =>
                updateNetwork({
                  liveUpdates: !settings.network.liveUpdates,
                })
              }
            />
          </div>

          <div className="mt-4 flex items-center gap-2 text-xs text-text-muted">
            <span>Current profile:</span>
            <Badge variant="info">{settings.network.mode}</Badge>
            {settings.network.liveUpdates ? (
              <Badge variant="success">realtime on</Badge>
            ) : (
              <Badge variant="warning">realtime paused</Badge>
            )}
          </div>
        </Card>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-surface-overlay/40 p-4 text-sm text-text-secondary">
        Default values: theme `{defaultSettings.display.theme}`, compact mode{" "}
        {defaultSettings.display.compactMode ? "on" : "off"}, notifications{" "}
        {defaultSettings.notifications.realtimeToasts ? "on" : "off"}, network{" "}
        {defaultSettings.network.mode}.
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-overlay">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{description}</p>
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-text-primary">{label}</p>
          <p className="mt-1 text-xs text-text-secondary">{description}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex h-7 w-12 items-center rounded-full border border-border bg-surface-overlay p-1 transition"
          aria-pressed={checked}
          aria-label={label}
        >
          <span
            className={`h-5 w-5 rounded-full transition ${
              checked
                ? "translate-x-5 bg-brand-500 shadow-[0_0_12px_rgba(20,184,166,0.5)]"
                : "translate-x-0 bg-text-muted"
            }`}
          />
        </button>
      </div>
    </div>
  );
}
