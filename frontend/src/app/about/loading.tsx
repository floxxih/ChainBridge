import { Skeleton } from "@/components/ui";

export default function AboutLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-12 md:py-20">
      <div className="text-center mb-16 space-y-4">
        <Skeleton className="h-6 w-32 mx-auto rounded-full" />
        <Skeleton className="h-12 w-96 max-w-full mx-auto" />
        <Skeleton className="h-6 w-full max-w-2xl mx-auto" />
      </div>
      <div className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-96 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    </div>
  );
}
