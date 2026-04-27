import { Skeleton } from "@/components/ui";

export default function HtlcsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-10 space-y-4">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-6 w-96 max-w-full" />
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
