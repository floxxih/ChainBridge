"use client";

import { useState, useEffect } from "react";

interface TimelockWarning {
  level: "info" | "warning" | "error";
  message: string;
  recommendation: string | null;
}

interface TimelockValidation {
  valid: boolean;
  warnings: TimelockWarning[];
  recommended_duration: number | null;
  adjusted_timelock: number | null;
}

interface TimelockWarningsProps {
  timelockHours: number;
  sourceChain?: string;
  destChain?: string;
}

const LEVEL_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  error: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-700 dark:text-red-300",
    icon: "\u26A0",
  },
  warning: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-200 dark:border-yellow-800",
    text: "text-yellow-700 dark:text-yellow-300",
    icon: "\u26A0",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-300",
    icon: "\u2139",
  },
};

export default function TimelockWarnings({
  timelockHours,
  sourceChain,
  destChain,
}: TimelockWarningsProps) {
  const [validation, setValidation] = useState<TimelockValidation | null>(null);

  useEffect(() => {
    const timeLock = Math.floor(Date.now() / 1000) + timelockHours * 3600;

    const warnings: TimelockWarning[] = [];
    let valid = true;

    if (timelockHours < 1) {
      warnings.push({
        level: "error",
        message: "Timelock must be at least 1 hour.",
        recommendation: "Increase the timelock duration.",
      });
      valid = false;
    } else if (timelockHours > 168) {
      warnings.push({
        level: "error",
        message: "Timelock cannot exceed 7 days (168 hours).",
        recommendation: "Reduce the timelock duration.",
      });
      valid = false;
    } else if (timelockHours < 2) {
      warnings.push({
        level: "warning",
        message: "Short timelock may not leave enough time for the counterparty.",
        recommendation: "Consider using at least 2 hours for safer swaps.",
      });
    } else if (timelockHours > 72) {
      warnings.push({
        level: "warning",
        message: "Long timelock means funds will be locked for an extended period.",
        recommendation: "Consider reducing to 72 hours or less.",
      });
    }

    if (sourceChain === "bitcoin" && timelockHours < 6) {
      warnings.push({
        level: "warning",
        message: "Bitcoin swaps recommended to use at least 6 hours due to block time.",
        recommendation: "Use 24 hours for Bitcoin swaps.",
      });
    }

    setValidation({
      valid,
      warnings,
      recommended_duration: 24 * 3600,
      adjusted_timelock: valid ? timeLock : null,
    });
  }, [timelockHours, sourceChain, destChain]);

  if (!validation || validation.warnings.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {validation.warnings.map((warning, idx) => {
        const style = LEVEL_STYLES[warning.level] || LEVEL_STYLES.info;
        return (
          <div
            key={idx}
            className={`p-3 rounded-lg border ${style.bg} ${style.border}`}
          >
            <div className={`flex items-start gap-2 ${style.text}`}>
              <span className="text-sm flex-shrink-0">{style.icon}</span>
              <div className="text-sm">
                <p className="font-medium">{warning.message}</p>
                {warning.recommendation && (
                  <p className="text-xs mt-1 opacity-80">
                    {warning.recommendation}
                  </p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
