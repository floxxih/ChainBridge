"use client";

import { Suspense, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Card, Badge, Skeleton } from "@/components/ui";

type VolumePeriod = "24h" | "7d" | "30d";

const LineChart = dynamic(() => import("@/components/charts").then((m) => m.LineChart), {
  loading: () => <Skeleton className="h-[220px] w-full rounded-xl" />,
  ssr: false,
});

const BarChartWrapper = dynamic(
  () => import("@/components/charts").then((m) => m.BarChartWrapper),
  { loading: () => <Skeleton className="h-[200px] w-full rounded-xl" />, ssr: false }
);

const DonutChart = dynamic(() => import("@/components/charts").then((m) => m.DonutChart), {
  loading: () => <Skeleton className="h-[160px] w-[160px] rounded-full mx-auto" />,
  ssr: false,
});

const RAW_DATA: Record<
  VolumePeriod,
  Array<{ timestamp: string; volume: number; order_count: number }>
> = {
  "24h": Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - (23 - i) * 3_600_000).toISOString(),
    volume: 40_000 + (i % 6) * 12_500 + i * 900,
    order_count: 18 + (i % 7),
  })),
  "7d": Array.from({ length: 7 }, (_, i) => ({
    timestamp: new Date(Date.now() - (6 - i) * 86_400_000).toISOString(),
    volume: 280_000 + i * 35_000,
    order_count: 150 + i * 10,
  })),
  "30d": Array.from({ length: 30 }, (_, i) => ({
    timestamp: new Date(Date.now() - (29 - i) * 86_400_000).toISOString(),
    volume: 200_000 + (i % 5) * 30_000 + i * 8_000,
    order_count: 120 + (i % 8) * 7,
  })),
};

const CHAIN_SLICES = [
  { label: "Stellar", value: 42, color: "#14b8a6" },
  { label: "Ethereum", value: 31, color: "#6366f1" },
  { label: "Bitcoin", value: 18, color: "#f97316" },
  { label: "Solana", value: 9, color: "#a855f7" },
];

function ChartSkeleton({ height }: { height: number }) {
  return <Skeleton className={`w-full rounded-xl`} style={{ height }} />;
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<VolumePeriod>("7d");
  const buckets = RAW_DATA[period];

  const totalVolume = useMemo(() => buckets.reduce((sum, b) => sum + b.volume, 0), [buckets]);

  const lineSeries = useMemo(
    () => [
      {
        label: "Volume",
        data: buckets.map((b) => ({ x: new Date(b.timestamp).getTime(), y: b.volume })),
        color: "#14b8a6",
      },
    ],
    [buckets]
  );

  const barData = useMemo(
    () =>
      buckets.map((b) => ({
        label:
          period === "24h"
            ? new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            : new Date(b.timestamp).toLocaleDateString([], { month: "short", day: "numeric" }),
        value: b.order_count,
      })),
    [buckets, period]
  );

  const fmtX = (x: string | number) =>
    period === "24h"
      ? new Date(Number(x)).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : new Date(Number(x)).toLocaleDateString([], { month: "short", day: "numeric" });

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Swap volume and order activity across rolling time windows.
          </p>
        </div>
        <Badge variant="info">Live Data</Badge>
      </div>

      {/* Period selector */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                period === p
                  ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
                  : "bg-surface-overlay text-text-secondary border border-border"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="ml-auto text-xs text-text-muted self-center">
            Total: ${totalVolume.toLocaleString()}
          </span>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Line chart – volume trend */}
        <Card className="p-6 lg:col-span-2">
          <p className="text-sm font-semibold text-text-primary mb-4">Volume Trend</p>
          <Suspense fallback={<ChartSkeleton height={220} />}>
            <LineChart
              series={lineSeries}
              height={220}
              formatX={fmtX}
              formatY={(v) => `$${v.toLocaleString()}`}
            />
          </Suspense>
        </Card>

        {/* Donut – chain distribution */}
        <Card className="p-6 flex flex-col items-center">
          <p className="text-sm font-semibold text-text-primary mb-4 self-start">Chain Mix</p>
          <Suspense fallback={<Skeleton className="h-[160px] w-[160px] rounded-full" />}>
            <DonutChart
              slices={CHAIN_SLICES}
              size={160}
              thickness={32}
              centerLabel="100%"
              centerSub="volume"
            />
          </Suspense>
        </Card>
      </div>

      {/* Bar chart – order count */}
      <Card className="p-6">
        <p className="text-sm font-semibold text-text-primary mb-4">Order Count</p>
        <Suspense fallback={<ChartSkeleton height={200} />}>
          <BarChartWrapper data={barData} height={200} formatValue={(v) => `${v} orders`} />
        </Suspense>
      </Card>
    </div>
  );
}
