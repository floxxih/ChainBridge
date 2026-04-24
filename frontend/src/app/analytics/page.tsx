"use client";

import { useMemo, useState } from "react";
import { Card, Badge } from "@/components/ui";
import { BarChart } from "@/components/admin/BarChart";

type VolumePeriod = "24h" | "7d" | "30d";

const DATA: Record<VolumePeriod, Array<{ timestamp: string; volume: number; order_count: number }>> = {
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

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<VolumePeriod>("7d");
  const buckets = DATA[period];

  const totalVolume = useMemo(
    () => buckets.reduce((sum, bucket) => sum + bucket.volume, 0),
    [buckets],
  );

  return (
    <div className="container mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-secondary mt-1">
            Swap volume charting across rolling time windows.
          </p>
        </div>
        <Badge variant="info">Issue #152</Badge>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {(["24h", "7d", "30d"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                period === p
                  ? "bg-brand-500/10 text-brand-500 border border-brand-500/30"
                  : "bg-surface-overlay text-text-secondary border border-border"
              }`}
            >
              {p}
            </button>
          ))}
          <span className="ml-auto text-xs text-text-muted">
            Total volume: ${totalVolume.toLocaleString()}
          </span>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-lg font-semibold text-text-primary mb-4">Swap Volume Chart</h2>
        <BarChart
          buckets={buckets}
          height={260}
          formatX={(timestamp) =>
            period === "24h"
              ? new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : new Date(timestamp).toLocaleDateString([], { month: "short", day: "numeric" })
          }
          formatValue={(value) => `$${value.toLocaleString()}`}
        />
      </Card>
    </div>
  );
}
