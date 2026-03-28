import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  accent?: "brand" | "emerald" | "amber" | "red" | "indigo";
  className?: string;
}

const accentMap = {
  brand: { icon: "text-brand-500", bg: "bg-brand-500/10", border: "border-brand-500/20" },
  emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
  amber: { icon: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20" },
  red: { icon: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20" },
  indigo: { icon: "text-indigo-400", bg: "bg-indigo-500/10", border: "border-indigo-500/20" },
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  trendValue,
  accent = "brand",
  className,
}: StatCardProps) {
  const colors = accentMap[accent];

  return (
    <div
      className={cn(
        "rounded-2xl border bg-surface-raised p-5 flex flex-col gap-3",
        colors.border,
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">
          {label}
        </span>
        {Icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", colors.bg)}>
            <Icon className={cn("h-4 w-4", colors.icon)} />
          </span>
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-text-primary">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
      </div>

      {trendValue && (
        <p
          className={cn(
            "text-xs font-medium",
            trend === "up"
              ? "text-emerald-400"
              : trend === "down"
                ? "text-red-400"
                : "text-text-muted"
          )}
        >
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"} {trendValue}
        </p>
      )}
    </div>
  );
}
