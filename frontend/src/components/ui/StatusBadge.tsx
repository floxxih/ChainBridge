"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes } from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Loader2,
  Circle,
  Pause,
  Ban,
  ShieldCheck,
  ShieldAlert,
  History,
} from "lucide-react";
import { OrderStatus, SwapStatus } from "@/types";

export type StatusVariant =
  | "success"
  | "pending"
  | "error"
  | "warning"
  | "info"
  | "processing"
  | "idle"
  | "paused"
  | "cancelled"
  | "locked";

export type StatusSize = "sm" | "md" | "lg";

interface StatusBadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "children"> {
  variant?: StatusVariant;
  size?: StatusSize;
  label?: string;
  showIcon?: boolean;
  pulse?: boolean;
  /** Explicitly handle OrderStatus from backend */
  orderStatus?: OrderStatus | string;
  /** Explicitly handle SwapStatus from backend */
  swapStatus?: SwapStatus | string;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  success: "bg-status-success/10 text-status-success border-status-success/20",
  pending: "bg-status-warning/10 text-status-warning border-status-warning/20",
  error: "bg-status-error/10 text-status-error border-status-error/20",
  warning: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  info: "bg-status-info/10 text-status-info border-status-info/20",
  processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  idle: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  paused: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  cancelled: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  locked: "bg-accent/10 text-accent border-accent/20",
};

const VARIANT_ICONS: Record<StatusVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle2,
  pending: Clock,
  error: XCircle,
  warning: AlertCircle,
  info: Circle,
  processing: Loader2,
  idle: Circle,
  paused: Pause,
  cancelled: Ban,
  locked: ShieldCheck,
};

const SIZE_STYLES = {
  sm: {
    badge: "px-2 py-0.5 text-[10px] gap-1",
    icon: "h-3 w-3",
  },
  md: {
    badge: "px-2.5 py-1 text-xs gap-1.5",
    icon: "h-3.5 w-3.5",
  },
  lg: {
    badge: "px-3 py-1.5 text-sm gap-2",
    icon: "h-4 w-4",
  },
};

/**
 * Maps OrderStatus to StatusBadge configuration
 */
const getOrderConfig = (status: OrderStatus | string): { variant: StatusVariant; label: string; icon?: any } => {
  switch (status) {
    case OrderStatus.OPEN:
      return { variant: "success", label: "Open" };
    case OrderStatus.FILLED:
      return { variant: "info", label: "Filled", icon: ShieldCheck };
    case OrderStatus.CANCELLED:
      return { variant: "error", label: "Cancelled" };
    case OrderStatus.EXPIRED:
      return { variant: "idle", label: "Expired", icon: History };
    default:
      return { variant: "idle", label: typeof status === 'string' ? status : "Unknown" };
  }
};

/**
 * Maps SwapStatus to StatusBadge configuration
 */
const getSwapConfig = (status: SwapStatus | string): { variant: StatusVariant; label: string; icon?: any } => {
  switch (status) {
    case SwapStatus.PENDING:
      return { variant: "pending", label: "Pending" };
    case SwapStatus.LOCKED_INITIATOR:
      return { variant: "locked", label: "Locked (Init)", icon: ShieldCheck };
    case SwapStatus.LOCKED_RESPONDER:
      return { variant: "locked", label: "Locked (Resp)", icon: ShieldCheck };
    case SwapStatus.COMPLETED:
      return { variant: "success", label: "Completed" };
    case SwapStatus.CANCELLED:
      return { variant: "error", label: "Cancelled" };
    case SwapStatus.EXPIRED:
      return { variant: "idle", label: "Expired", icon: History };
    default:
      return { variant: "idle", label: typeof status === 'string' ? status : "Unknown" };
  }
};

/**
 * StatusBadge - Reusable badge for order and swap lifecycle states.
 * Supports consistent color semantics and safe degradation for unknown statuses.
 */
export function StatusBadge({
  variant: providedVariant,
  size = "md",
  label: providedLabel,
  showIcon = true,
  pulse = false,
  orderStatus,
  swapStatus,
  className,
  ...props
}: StatusBadgeProps) {
  let config: { variant: StatusVariant; label: string; icon?: any } = {
    variant: providedVariant || "idle",
    label: providedLabel || "",
  };

  if (orderStatus) {
    config = getOrderConfig(orderStatus);
  } else if (swapStatus) {
    config = getSwapConfig(swapStatus);
  }

  const Icon = config.icon || VARIANT_ICONS[config.variant];
  const isAnimated = config.variant === "processing" || pulse;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold uppercase tracking-wider",
        VARIANT_STYLES[config.variant],
        SIZE_STYLES[size].badge,
        isAnimated && "animate-pulse",
        className
      )}
      {...props}
    >
      {showIcon && (
        <Icon className={cn(SIZE_STYLES[size].icon, config.variant === "processing" && "animate-spin")} />
      )}
      {config.label && <span>{config.label}</span>}
    </span>
  );
}

/**
 * StatusDot - Minimal dot indicator
 */
export function StatusDot({
  variant,
  size = "md",
  pulse = false,
  className,
}: {
  variant: StatusVariant;
  size?: StatusSize;
  pulse?: boolean;
  className?: string;
}) {
  const dotSize = {
    sm: "h-2 w-2",
    md: "h-2.5 w-2.5",
    lg: "h-3 w-3",
  }[size];

  const dotColor = {
    success: "bg-status-success",
    pending: "bg-status-warning",
    error: "bg-status-error",
    warning: "bg-orange-500",
    info: "bg-status-info",
    processing: "bg-blue-500",
    idle: "bg-gray-500",
    paused: "bg-purple-500",
    cancelled: "bg-slate-500",
    locked: "bg-accent",
  }[variant];

  return (
    <span
      className={cn(
        "inline-block rounded-full",
        dotSize,
        dotColor,
        (pulse || variant === "processing") && "animate-pulse",
        className
      )}
    />
  );
}
