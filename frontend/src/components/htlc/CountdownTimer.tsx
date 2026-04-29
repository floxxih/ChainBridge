"use client";

import { Clock3, AlertTriangle, TimerOff } from "lucide-react";
import { clsx } from "clsx";
import { useEffect, useMemo, useState } from "react";

interface CountdownTimerProps {
  targetTimestamp: number;
  warningThresholdSeconds?: number;
  criticalThresholdSeconds?: number;
  compact?: boolean;
  className?: string;
}

type CountdownState = "normal" | "warning" | "critical" | "expired";

function getRemainingSeconds(targetTimestamp: number) {
  return Math.max(targetTimestamp - Math.floor(Date.now() / 1000), 0);
}

function formatRemaining(seconds: number, compact: boolean) {
  if (seconds <= 0) {
    return compact ? "Expired" : "Expired and refundable";
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (compact) {
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  }

  if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  if (minutes > 0) return `${minutes}m ${secs}s remaining`;
  return `${secs}s remaining`;
}

export function CountdownTimer({
  targetTimestamp,
  warningThresholdSeconds = 3600,
  criticalThresholdSeconds = 300,
  compact = false,
  className,
}: CountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(targetTimestamp)
  );

  useEffect(() => {
    setRemainingSeconds(getRemainingSeconds(targetTimestamp));

    const interval = window.setInterval(
      () => {
        setRemainingSeconds(getRemainingSeconds(targetTimestamp));
      },
      remainingSeconds > 3600 ? 30_000 : 1_000
    );

    return () => window.clearInterval(interval);
  }, [targetTimestamp, remainingSeconds]);

  const countdownState = useMemo<CountdownState>(() => {
    if (remainingSeconds <= 0) return "expired";
    if (remainingSeconds <= criticalThresholdSeconds) return "critical";
    if (remainingSeconds <= warningThresholdSeconds) return "warning";
    return "normal";
  }, [criticalThresholdSeconds, remainingSeconds, warningThresholdSeconds]);

  const Icon =
    countdownState === "expired"
      ? TimerOff
      : countdownState === "warning" || countdownState === "critical"
        ? AlertTriangle
        : Clock3;

  return (
    <div
      className={clsx(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold",
        countdownState === "expired" && "border-red-500/20 bg-red-500/5 text-red-300",
        countdownState === "critical" && "border-red-500/20 bg-red-500/5 text-red-300",
        countdownState === "warning" && "border-amber-500/20 bg-amber-500/5 text-amber-300",
        countdownState === "normal" && "border-brand-500/20 bg-brand-500/5 text-text-primary",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{formatRemaining(remainingSeconds, compact)}</span>
    </div>
  );
}
