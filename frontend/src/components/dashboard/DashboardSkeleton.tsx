import { Activity, ArrowRightLeft, BarChart3, Clock, Radio, TrendingUp } from "lucide-react";
import { Card, Skeleton } from "@/components/ui";
import { cn, CHAIN_COLORS } from "@/lib/utils";

const KPI_ICONS = [
  <TrendingUp key="volume" className="h-5 w-5 text-brand-500" />,
  <ArrowRightLeft key="swaps" className="h-5 w-5 text-indigo-500" />,
  <BarChart3 key="count" className="h-5 w-5 text-emerald-500" />,
  <Clock key="settlement" className="h-5 w-5 text-amber-500" />,
];

const CHAINS = ["stellar", "bitcoin", "ethereum"] as const;

export function DashboardSkeleton() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-10 space-y-3">
        <Skeleton className="h-10 w-72 max-w-full" />
        <Skeleton className="h-4 w-[28rem] max-w-full" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_ICONS.map((icon, index) => (
          <Card key={index} variant="raised" className="p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-surface-overlay">
                {icon}
              </div>
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>

      <Card variant="raised" className="p-6">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-5 w-5 text-brand-500" />
          <Skeleton className="h-6 w-32" />
        </div>
        <div>
          {CHAINS.map((chain) => (
            <div
              key={chain}
              className="flex items-center justify-between border-b border-border py-3 last:border-b-0"
            >
              <div className="flex items-center gap-3">
                <Radio className={cn("h-4 w-4", CHAIN_COLORS[chain] ?? "text-text-muted")} />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
