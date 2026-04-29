"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  deadline: string | Date;
  onExpire?: () => void;
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export function CountdownTimer({
  deadline,
  onExpire,
  className,
  showLabel = true,
  compact = false,
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  useEffect(() => {
    const deadlineDate = typeof deadline === "string" ? new Date(deadline) : deadline;

    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = deadlineDate.getTime() - now.getTime();

      if (difference <= 0) {
        return {
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
          isExpired: true,
        };
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      return { days, hours, minutes, seconds, isExpired: false };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.isExpired && onExpire) {
        onExpire();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline, onExpire]);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        {timeLeft.isExpired ? (
          <div className="flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/5 px-2.5 py-0.5">
            <AlertCircle className="h-3 w-3 text-red-500" aria-hidden="true" />
            <span className="text-xs font-medium text-red-500">Expired</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-sm font-mono text-text-secondary">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {timeLeft.days > 0 && (
              <>
                {timeLeft.days}d {timeLeft.hours}h
              </>
            )}
            {timeLeft.days === 0 && (
              <>
                {String(timeLeft.hours).padStart(2, "0")}:
                {String(timeLeft.minutes).padStart(2, "0")}:
                {String(timeLeft.seconds).padStart(2, "0")}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showLabel && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">
          Time remaining (UTC)
        </p>
      )}
      {timeLeft.isExpired ? (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2">
          <AlertCircle className="h-4 w-4 text-red-500" aria-hidden="true" />
          <span className="text-sm font-semibold text-red-500">Expired</span>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <div className="flex items-center gap-2 font-mono text-sm">
            {timeLeft.days > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-2xl font-bold text-text-primary">
                  {timeLeft.days}
                </span>
                <span className="text-xs text-text-muted">d</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-text-primary">
                {String(timeLeft.hours).padStart(2, "0")}
              </span>
              <span className="text-xs text-text-muted">h</span>
            </div>
            <span className="text-text-muted">:</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-text-primary">
                {String(timeLeft.minutes).padStart(2, "0")}
              </span>
              <span className="text-xs text-text-muted">m</span>
            </div>
            <span className="text-text-muted">:</span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-text-primary">
                {String(timeLeft.seconds).padStart(2, "0")}
              </span>
              <span className="text-xs text-text-muted">s</span>
            </div>
          </div>
        </div>
      )}
      <p className="text-xs text-text-muted">
        Timezone: UTC (Coordinated Universal Time)
      </p>
    </div>
  );
}
