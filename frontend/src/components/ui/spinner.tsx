import { cn } from "@/lib/utils";

interface SpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "h-4 w-4 border-2",
  md: "h-8 w-8 border-2",
  lg: "h-12 w-12 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={cn(
        "animate-spin rounded-full border-text-muted border-t-brand-500",
        sizeStyles[size],
        className
      )}
    >
      <span className="sr-only">Loading…</span>
    </div>
  );
}

interface LoadingStateProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingState({ label = "Loading…", size = "md", className }: LoadingStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}
    >
      <Spinner size={size} />
      <p className="text-sm text-text-muted motion-safe:animate-pulse" aria-hidden="true">
        {label}
      </p>
    </div>
  );
}

/** Skeleton shimmer block for placeholder loading */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg bg-surface-overlay motion-safe:animate-pulse motion-reduce:opacity-90",
        className
      )}
    />
  );
}

/** Card skeleton placeholder */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface-raised p-5", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

/** List item skeleton placeholder */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-2xl border border-border bg-surface-raised p-4",
        className
      )}
    >
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-xl shrink-0" />
    </div>
  );
}

/** Form skeleton placeholder */
export function FormSkeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

/** Timeline event skeleton placeholder */
export function TimelineItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex gap-4", className)}>
      <div className="flex flex-col items-center">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="w-0.5 flex-1" />
      </div>
      <div className="flex-1 space-y-2 pb-6">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  );
}

/** Stat card skeleton placeholder */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-2xl border border-border bg-surface-overlay/40 p-4", className)}>
      <Skeleton className="h-3 w-20 mb-3" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/** Table row skeleton placeholder */
export function TableRowSkeleton({ cols = 5, className }: { cols?: number; className?: string }) {
  return (
    <tr className={cn("border-b border-border", className)}>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

/** Avatar skeleton placeholder */
export function AvatarSkeleton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeStyles = { sm: "h-8 w-8", md: "h-10 w-10", lg: "h-14 w-14" };
  return <Skeleton className={cn("rounded-full", sizeStyles[size], className)} />;
}

/** Badge skeleton placeholder */
export function BadgeSkeleton({ className }: { className?: string }) {
  return <Skeleton className={cn("h-6 w-20 rounded-full", className)} />;
}
