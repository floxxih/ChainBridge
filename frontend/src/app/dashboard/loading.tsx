import { Skeleton } from "@/components/ui";

export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <Skeleton className="h-10 w-48" />

      <div className="rounded-xl border border-border bg-surface-overlay p-6 space-y-6">
        <Skeleton className="h-7 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-overlay p-6 space-y-6">
        <Skeleton className="h-7 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-14 rounded-xl" />
          <Skeleton className="h-14 rounded-xl" />
        </div>
      </div>

      <Skeleton className="h-11 w-36 rounded-xl" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-28 rounded-xl" />
      </div>
    </div>
  );
}
