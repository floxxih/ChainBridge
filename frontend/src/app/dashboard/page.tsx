"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import { Card, Badge } from "@/components/ui";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { cn, CHAIN_COLORS } from "@/lib/utils";
import {
  Activity,
  ArrowRightLeft,
  BarChart3,
  Clock,
  Radio,
  TrendingUp,
} from "lucide-react";
import type { ProtocolStats, ChainHealth, ChainStatus } from "@/types";

const PLACEHOLDER_STATS: ProtocolStats = {
  totalVolume: "$2.4M",
  activeSwaps: 12,
  totalSwaps: 1847,
  avgSettlementTime: "~1.5m",
  chains: [
    { chain: "stellar", status: "operational", latency: 42, blockHeight: 52_491_003 },
    { chain: "bitcoin", status: "operational", latency: 310, blockHeight: 891_204 },
    { chain: "ethereum", status: "degraded", latency: 890, blockHeight: 19_842_110 },
  ],
};

async function fetchProtocolStats(): Promise<ProtocolStats> {
  // Placeholder: return mock data with simulated network delay
  await new Promise((r) => setTimeout(r, 600));
  return PLACEHOLDER_STATS;
}

const STATUS_CONFIG: Record<ChainStatus, { variant: "success" | "warning" | "error"; label: string }> = {
  operational: { variant: "success", label: "Operational" },
  degraded: { variant: "warning", label: "Degraded" },
  down: { variant: "error", label: "Down" },
};

function ChainStatusRow({ chain }: { chain: ChainHealth }) {
  const config = STATUS_CONFIG[chain.status];
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-3">
        <Radio className={cn("h-4 w-4", CHAIN_COLORS[chain.chain] ?? "text-text-muted")} />
        <span className="text-sm font-medium capitalize text-text-primary">{chain.chain}</span>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-xs text-text-muted">{chain.latency}ms</span>
        <Badge variant={config.variant}>{config.label}</Badge>
      </div>
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card variant="raised" className="p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-overlay border border-border">
          {icon}
        </div>
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboard.stats,
    queryFn: fetchProtocolStats,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Hero */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-text-primary sm:text-4xl">Protocol Dashboard</h1>
        <p className="mt-2 text-text-secondary">
          Live overview of ChainBridge protocol health, volume, and active swaps.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        <KPICard
          icon={<TrendingUp className="h-5 w-5 text-brand-500" />}
          label="Total Volume"
          value={data?.totalVolume ?? "-"}
        />
        <KPICard
          icon={<ArrowRightLeft className="h-5 w-5 text-indigo-500" />}
          label="Active Swaps"
          value={data?.activeSwaps ?? 0}
        />
        <KPICard
          icon={<BarChart3 className="h-5 w-5 text-emerald-500" />}
          label="Total Swaps"
          value={data?.totalSwaps ?? 0}
        />
        <KPICard
          icon={<Clock className="h-5 w-5 text-amber-500" />}
          label="Avg. Settlement"
          value={data?.avgSettlementTime ?? "-"}
        />
      </div>

      {/* Chain Health */}
      <Card variant="raised" className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-brand-500" />
          <h2 className="text-lg font-bold text-text-primary">Chain Status</h2>
        </div>
        {isError ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">
              Unable to load chain status. Please try again later.
            </p>
          </div>
        ) : data?.chains.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-muted">No chains are currently monitored.</p>
          </div>
        ) : (
          <div>
            {data?.chains.map((chain) => (
              <ChainStatusRow key={chain.chain} chain={chain} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
