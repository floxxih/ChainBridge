import { Skeleton } from "@/components/ui";

export default function TransactionsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-12 w-72" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:flex">
          <div className="rounded-2xl border border-border bg-surface-overlay/50 p-4 min-w-[140px]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-8 w-12 mt-2" />
          </div>
          <div className="rounded-2xl border border-border bg-surface-overlay/50 p-4 min-w-[140px]">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-8 w-12 mt-2" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-raised p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-5 w-20 ml-auto" />
                <Skeleton className="h-4 w-28 ml-auto" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <Skeleton className="h-2 flex-1 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
