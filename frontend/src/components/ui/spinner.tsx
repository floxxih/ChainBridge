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
      className={cn(
        "animate-spin rounded-full border-text-muted border-t-brand-500",
        sizeStyles[size],
        className
      )}
      aria-label="Loading"
    />
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
      className={cn("flex flex-col items-center justify-center gap-3 py-12 text-center", className)}
    >
      <Spinner size={size} />
      <p className="text-sm text-text-muted animate-pulse">{label}</p>
    </div>
  );
}

/** Skeleton shimmer block for placeholder loading */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-overlay", className)} />;
}
