import { Skeleton } from "@/components/ui";

export default function BrowseLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20">
      <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-5 w-36 rounded-full" />
          <Skeleton className="h-12 w-56" />
          <Skeleton className="h-6 w-96 max-w-full" />
        </div>
        <Skeleton className="h-10 w-44 rounded-xl" />
      </div>

      <div className="space-y-8">
        <div className="rounded-2xl border border-border bg-surface-raised p-4">
          <div className="flex flex-wrap gap-4">
            <Skeleton className="h-10 w-64 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-5 w-40" />
          </div>

          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-surface-raised p-4">
              <div className="grid grid-cols-6 gap-4 items-center">
                <Skeleton className="h-5 rounded" />
                <Skeleton className="h-5 rounded" />
                <Skeleton className="h-5 rounded" />
                <Skeleton className="h-5 rounded" />
                <Skeleton className="h-5 rounded" />
                <Skeleton className="h-9 w-20 rounded-xl ml-auto" />
              </div>
            </div>
          ))}

          <div className="mt-6 flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <Skeleton className="h-9 w-9 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
