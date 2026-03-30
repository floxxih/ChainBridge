"use client";

import { Skeleton } from "@/components/ui";

export default function RootLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-10 space-y-4">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-[32rem] max-w-full" />
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>

      <div className="space-y-3 rounded-2xl border border-border bg-background/50 p-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="grid gap-3 md:grid-cols-4">
            <Skeleton className="h-6 rounded-xl" />
            <Skeleton className="h-6 rounded-xl" />
            <Skeleton className="h-6 rounded-xl" />
            <Skeleton className="h-6 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
