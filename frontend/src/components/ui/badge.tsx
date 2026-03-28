import { cn, CHAIN_BG } from "@/lib/utils";
import { HTMLAttributes } from "react";
import type { SwapStatus } from "@/types";

type BadgeVariant = "default" | "success" | "warning" | "error" | "info" | "chain";

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  chain?: string;
  status?: SwapStatus;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  locked_initiator: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  locked_responder: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  cancelled: "bg-red-500/10 text-red-400 border-red-500/20",
  expired: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  locked_initiator: "Locked (Init)",
  locked_responder: "Locked (Resp)",
  completed: "Completed",
  cancelled: "Cancelled",
  expired: "Expired",
};

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-overlay text-text-secondary border-border",
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  error: "bg-red-500/10 text-red-400 border-red-500/20",
  info: "bg-brand-500/10 text-brand-500 border-brand-500/20",
  chain: "",
};

export function Badge({
  variant = "default",
  chain,
  status,
  className,
  children,
  ...props
}: BadgeProps) {
  const chainStyle = chain ? (CHAIN_BG[chain.toLowerCase()] ?? "") : "";
  const statusStyle = status ? (STATUS_STYLES[status] ?? "") : "";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variant === "chain" ? chainStyle : variantStyles[variant],
        status && statusStyle,
        className
      )}
      {...props}
    >
      {status ? STATUS_LABELS[status] : children}
    </span>
  );
}
