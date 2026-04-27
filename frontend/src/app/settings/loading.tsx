import { Skeleton } from "@/components/ui";

export default function SettingsLoading() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-12 md:py-20">
      <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-8 w-32 rounded-full" />
          <Skeleton className="h-12 w-40" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="space-y-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-surface-raised p-6">
            <div className="flex items-start gap-3">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-5 w-64" />
              </div>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20 rounded-xl" />
              <Skeleton className="h-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>

      <Skeleton className="mt-6 h-16 w-full rounded-2xl" />
    </div>
  );
}
