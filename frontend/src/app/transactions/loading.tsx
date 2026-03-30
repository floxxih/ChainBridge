import { Skeleton } from "@/components/ui";
import { TransactionFeedSkeleton } from "@/components/transactions/TransactionFeedSkeleton";

export default function TransactionsLoading() {
  return (
    <div className="container mx-auto max-w-6xl px-4 py-12 md:py-20">
      <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="space-y-4">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-4 w-[32rem] max-w-full" />
        </div>

        <div className="grid grid-cols-2 gap-4 md:flex">
          <Skeleton className="h-24 min-w-[140px] rounded-2xl" />
          <Skeleton className="h-24 min-w-[140px] rounded-2xl" />
        </div>
      </div>

      <TransactionFeedSkeleton rows={6} />
    </div>
  );
}
