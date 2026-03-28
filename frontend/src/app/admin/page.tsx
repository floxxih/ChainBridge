"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Shield,
  BarChart3,
  Layers,
  ArrowRightLeft,
  Activity,
  Users,
  Bell,
  RefreshCw,
  LogOut,
} from "lucide-react";
import { Badge, Button, Spinner, Card } from "@/components/ui";
import { StatCard } from "@/components/admin/StatCard";
import { BarChart } from "@/components/admin/BarChart";
import { HTLCMonitor } from "@/components/admin/HTLCMonitor";
import { ChainHealthPanel } from "@/components/admin/ChainHealthPanel";
import { UserActivityPanel } from "@/components/admin/UserActivityPanel";
import { AlertsPanel } from "@/components/admin/AlertsPanel";
import { DisputesPanel } from "@/components/admin/DisputesPanel";
import { AdminLoginGate } from "@/components/admin/AdminLoginGate";
import {
  useAdminStats,
  useAdminVolume,
  useActiveHTLCs,
  useChainHealth,
  useUserMetrics,
  useAlerts,
  useDisputes,
} from "@/hooks/useAdminStats";
import { getAdminApiKey, clearAdminApiKey } from "@/lib/adminApi";

type VolumePeriod = "1h" | "24h" | "7d" | "30d";

export default function AdminDashboardPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [volumePeriod, setVolumePeriod] = useState<VolumePeriod>("24h");

  // Check if the user already has a stored admin key
  useEffect(() => {
    if (getAdminApiKey()) setAuthenticated(true);
  }, []);

  const handleLogout = useCallback(() => {
    clearAdminApiKey();
    setAuthenticated(false);
  }, []);

  if (!authenticated) {
    return <AdminLoginGate onAuthenticated={() => setAuthenticated(true)} />;
  }

  return (
    <Dashboard
      volumePeriod={volumePeriod}
      setVolumePeriod={setVolumePeriod}
      onLogout={handleLogout}
    />
  );
}

function Dashboard({
  volumePeriod,
  setVolumePeriod,
  onLogout,
}: {
  volumePeriod: VolumePeriod;
  setVolumePeriod: (v: VolumePeriod) => void;
  onLogout: () => void;
}) {
  const stats = useAdminStats();
  const volume = useAdminVolume(volumePeriod);
  const htlcs = useActiveHTLCs();
  const chains = useChainHealth();
  const userMetrics = useUserMetrics();
  const alerts = useAlerts();
  const disputes = useDisputes();

  const allLoading = stats.loading && volume.loading;

  return (
    <div className="container mx-auto max-w-7xl px-4 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="info" className="bg-brand-500/10 text-brand-500 border-brand-500/20">
              <Shield className="mr-1 h-3 w-3" /> Admin
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
            Protocol Dashboard
          </h1>
          <p className="mt-2 text-text-secondary">
            Monitor swap volumes, HTLC health, chain status, and system alerts in real time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stats.refetch();
              volume.refetch();
              htlcs.refetch();
              chains.refetch();
            }}
          >
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onLogout}>
            <LogOut className="mr-1 h-3.5 w-3.5" /> Logout
          </Button>
        </div>
      </div>

      {allLoading && (
        <div className="flex items-center justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      )}

      {/* Protocol Overview KPIs */}
      {stats.data && (
        <section className="mb-8">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <StatCard
              label="Total Swaps"
              value={stats.data.swaps.total}
              icon={ArrowRightLeft}
              accent="brand"
            />
            <StatCard
              label="Executed"
              value={stats.data.swaps.executed}
              icon={Layers}
              accent="emerald"
            />
            <StatCard
              label="Open Orders"
              value={stats.data.orders.open}
              icon={BarChart3}
              accent="indigo"
            />
            <StatCard
              label="Active HTLCs"
              value={stats.data.htlcs.active}
              icon={Activity}
              accent="amber"
            />
            <StatCard
              label="Open Disputes"
              value={stats.data.disputes.open}
              icon={Bell}
              accent="red"
            />
            <StatCard
              label="Volume (24h)"
              value={stats.data.volume.last_24h.toLocaleString()}
              icon={BarChart3}
              accent="brand"
            />
            <StatCard
              label="Unique Users"
              value={stats.data.users.unique_creators}
              icon={Users}
              accent="indigo"
            />
          </div>
        </section>
      )}

      {/* Swap Volume Chart */}
      <section className="mb-8">
        <Card variant="raised" className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-text-primary">Swap Volume</h2>
            <div className="flex gap-1">
              {(["1h", "24h", "7d", "30d"] as VolumePeriod[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setVolumePeriod(p)}
                  className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                    volumePeriod === p
                      ? "bg-brand-500/10 text-brand-500"
                      : "text-text-muted hover:text-text-primary"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {volume.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : volume.data ? (
            <BarChart
              buckets={volume.data.buckets}
              height={220}
              formatX={(ts) =>
                volumePeriod === "1h" || volumePeriod === "24h"
                  ? new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" })
              }
            />
          ) : null}
          {volume.error && <p className="text-sm text-red-400 py-4 text-center">{volume.error}</p>}
        </Card>
      </section>

      {/* Two-column: HTLCs + Chain Health */}
      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card variant="raised" className="p-6">
          {htlcs.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : htlcs.data ? (
            <HTLCMonitor htlcs={htlcs.data.htlcs} activeCount={htlcs.data.active_count} />
          ) : null}
          {htlcs.error && <p className="text-sm text-red-400 py-4 text-center">{htlcs.error}</p>}
        </Card>

        <Card variant="raised" className="p-6">
          {chains.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : chains.data ? (
            <ChainHealthPanel chains={chains.data.chains} />
          ) : null}
          {chains.error && <p className="text-sm text-red-400 py-4 text-center">{chains.error}</p>}
        </Card>
      </section>

      {/* User Activity */}
      <section className="mb-8">
        <Card variant="raised" className="p-6">
          {userMetrics.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : userMetrics.data ? (
            <UserActivityPanel metrics={userMetrics.data} />
          ) : null}
          {userMetrics.error && (
            <p className="text-sm text-red-400 py-4 text-center">{userMetrics.error}</p>
          )}
        </Card>
      </section>

      {/* Alert Configuration */}
      <section className="mb-8">
        <Card variant="raised" className="p-6">
          {alerts.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <AlertsPanel
              alerts={alerts.data ?? []}
              onAdd={alerts.add}
              onEdit={alerts.edit}
              onDelete={alerts.remove}
            />
          )}
          {alerts.error && <p className="text-sm text-red-400 py-4 text-center">{alerts.error}</p>}
        </Card>
      </section>

      {/* Dispute Review */}
      <section className="mb-8">
        <Card variant="raised" className="p-6">
          {disputes.disputes.loading || disputes.stats.loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : (
            <DisputesPanel
              disputes={disputes.disputes.data ?? []}
              stats={disputes.stats.data}
              onReview={disputes.startReview}
              onResolve={disputes.resolve}
            />
          )}
          {(disputes.disputes.error || disputes.stats.error) && (
            <p className="text-sm text-red-400 py-4 text-center">
              {disputes.disputes.error ?? disputes.stats.error}
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}
