import { Skeleton } from "@/components/ui";

export default function AdminLoading() {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 md:py-20">
      <Skeleton className="h-12 w-48 mb-10" />
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}
