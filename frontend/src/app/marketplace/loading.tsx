import { Skeleton } from "@/components/ui";

export default function MarketplaceLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20">
      <div className="mb-12 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl space-y-4">
          <Skeleton className="h-6 w-32 rounded-full" />
          <Skeleton className="h-14 w-64" />
          <Skeleton className="h-8 w-full max-w-xl" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-12 w-28 rounded-xl" />
          <Skeleton className="h-12 w-36 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        <div className="lg:col-span-3 space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface-raised p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="h-5 w-20 ml-auto" />
                  <Skeleton className="h-4 w-16 ml-auto" />
                </div>
                <Skeleton className="h-9 w-20 rounded-xl" />
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-overlay/30 p-6">
            <Skeleton className="h-5 w-32 mb-4" />
            <Skeleton className="h-40 w-full rounded-xl" />
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-7 w-16 mx-auto mt-2" />
              </div>
              <div className="text-center">
                <Skeleton className="h-4 w-12 mx-auto" />
                <Skeleton className="h-7 w-16 mx-auto mt-2" />
              </div>
            </div>
          </div>
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
