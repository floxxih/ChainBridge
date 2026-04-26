import { Skeleton } from "@/components/ui";

export default function SwapLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 md:py-20">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-10 w-56 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>

      <div className="space-y-4 rounded-2xl border border-border p-6">
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-10 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
    </div>
  );
}
