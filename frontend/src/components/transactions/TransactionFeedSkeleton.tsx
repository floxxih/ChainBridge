import { Search, Download } from "lucide-react";
import { Button, Skeleton } from "@/components/ui";

export function TransactionFeedSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Button variant="secondary" size="sm" disabled icon={<Download className="h-4 w-4" />}>
            Export
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-background/50 shadow-glow-sm backdrop-blur-sm">
        <div className="hidden border-b border-border/50 bg-surface-overlay/30 md:grid md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr]">
          {["Type / Status", "Asset", "Hash", "Progress", "Actions"].map((label) => (
            <div key={label} className="px-6 py-4">
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="divide-y divide-border/50">
          {Array.from({ length: rows }).map((_, index) => (
            <div
              key={index}
              className="grid gap-4 px-4 py-5 md:grid-cols-[1.2fr_0.8fr_1fr_0.8fr_0.8fr] md:px-6"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-14" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-full max-w-28" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="flex items-center justify-start gap-2 md:justify-end">
                <Skeleton className="h-9 w-20 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-brand-500/10 bg-brand-500/5 p-4 md:flex-row md:items-center md:gap-8">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-3 w-36" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}
