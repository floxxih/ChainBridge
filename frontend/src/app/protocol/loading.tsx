import { Skeleton } from "@/components/ui";

export default function ProtocolLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <Skeleton className="h-12 w-64 mb-8" />
      <div className="grid gap-6 md:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
