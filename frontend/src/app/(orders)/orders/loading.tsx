import { Skeleton } from "@/components/ui";

export default function OrdersLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-12 w-64 max-w-full" />
          <Skeleton className="h-4 w-[30rem] max-w-full" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-32 rounded-2xl" />
          <Skeleton className="h-24 w-32 rounded-2xl" />
        </div>
      </div>

      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-36 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
