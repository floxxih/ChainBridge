import { Skeleton } from "@/components/ui";

export default function TrackingLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-4 w-28 rounded-full" />
        <Skeleton className="h-12 w-72 max-w-full" />
        <Skeleton className="h-4 w-[26rem] max-w-full" />
      </div>
      <Skeleton className="h-36 rounded-2xl" />
    </div>
  );
}
