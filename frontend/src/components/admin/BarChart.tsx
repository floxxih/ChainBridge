"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { VolumeBucket } from "@/lib/adminApi";

interface BarChartProps {
  buckets: VolumeBucket[];
  height?: number;
  className?: string;
  /** Format the x-axis tick label */
  formatX?: (ts: string) => string;
  /** Format the tooltip value */
  formatValue?: (v: number) => string;
}

const PAD = { top: 16, right: 12, bottom: 32, left: 52 };

export function BarChart({
  buckets,
  height = 200,
  className,
  formatX,
  formatValue,
}: BarChartProps) {
  const { bars, yTicks, xLabels, maxVal } = useMemo(() => {
    if (!buckets.length) return { bars: [], yTicks: [], xLabels: [], maxVal: 0 };

    const maxVal = Math.max(...buckets.map((b) => b.volume), 1);
    const inner = { w: 600 - PAD.left - PAD.right, h: height - PAD.top - PAD.bottom };
    const barW = Math.max(2, inner.w / buckets.length - 2);

    const bars = buckets.map((b, i) => {
      const barH = (b.volume / maxVal) * inner.h;
      return {
        x: PAD.left + i * (inner.w / buckets.length),
        y: PAD.top + inner.h - barH,
        w: barW,
        h: barH,
        bucket: b,
      };
    });

    const steps = 4;
    const yTicks = Array.from({ length: steps + 1 }, (_, i) => ({
      value: (maxVal / steps) * i,
      y: PAD.top + inner.h - (inner.h / steps) * i,
    }));

    // Show ~6 x-axis labels
    const stride = Math.max(1, Math.floor(buckets.length / 6));
    const xLabels = buckets
      .filter((_, i) => i % stride === 0)
      .map((b, idx) => ({
        x: PAD.left + idx * stride * (inner.w / buckets.length) + barW / 2,
        label: formatX
          ? formatX(b.timestamp)
          : new Date(b.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      }));

    return { bars, yTicks, xLabels, maxVal };
  }, [buckets, height, formatX]);

  if (!buckets.length) {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-border bg-surface py-12 text-sm text-text-muted",
          className
        )}
      >
        No data for selected period
      </div>
    );
  }

  const fmt = formatValue ?? ((v: number) => v.toLocaleString());

  return (
    <div
      className={cn("w-full overflow-hidden rounded-xl border border-border bg-surface", className)}
    >
      <svg
        viewBox={`0 0 600 ${height}`}
        className="w-full"
        style={{ height }}
        aria-label="Volume bar chart"
      >
        {/* Grid lines + Y ticks */}
        {yTicks.map((t) => (
          <g key={t.y}>
            <line
              x1={PAD.left}
              y1={t.y}
              x2={600 - PAD.right}
              y2={t.y}
              stroke="currentColor"
              strokeOpacity={0.06}
              strokeWidth={1}
            />
            <text
              x={PAD.left - 6}
              y={t.y + 4}
              textAnchor="end"
              className="fill-text-muted text-[9px]"
              fontSize={9}
            >
              {t.value >= 1_000_000
                ? `${(t.value / 1_000_000).toFixed(1)}M`
                : t.value >= 1_000
                  ? `${(t.value / 1_000).toFixed(0)}K`
                  : String(Math.round(t.value))}
            </text>
          </g>
        ))}

        {/* Bars */}
        {bars.map((b, i) => (
          <g key={i}>
            <rect
              x={b.x}
              y={b.y}
              width={b.w}
              height={Math.max(b.h, 1)}
              rx={2}
              className="fill-brand-500/70 hover:fill-brand-500 transition-colors duration-100 cursor-pointer"
            >
              <title>
                {fmt(b.bucket.volume)} ({b.bucket.order_count} orders)
              </title>
            </rect>
          </g>
        ))}

        {/* X labels */}
        {xLabels.map((l) => (
          <text
            key={l.x}
            x={l.x}
            y={height - 6}
            textAnchor="middle"
            className="fill-text-muted text-[9px]"
            fontSize={9}
          >
            {l.label}
          </text>
        ))}
      </svg>
    </div>
  );
}
