import { Skeleton } from "@/components/ui";

export default function SwapsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-5 w-64" />
          </div>
        </div>
        <Skeleton className="h-9 w-24 rounded-xl" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface-raised p-5">
              <Skeleton className="h-4 w-28 mb-3" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="rounded-2xl border border-border bg-surface-raised p-5">
              <Skeleton className="h-4 w-20 mb-3" />
              <Skeleton className="h-6 w-40" />
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-5 w-32 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface-overlay">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="space-y-6">
          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-4 w-28 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-surface-overlay p-3">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-4 w-24 mt-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-12 w-full rounded-xl" />
          </div>

          <div className="rounded-2xl border border-border bg-surface-raised p-5">
            <Skeleton className="h-4 w-28 mb-3" />
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32 mt-2" />
          </div>
        </aside>
      </div>
    </div>
  );
}
