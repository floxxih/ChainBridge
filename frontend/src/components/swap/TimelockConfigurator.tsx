"use client";

import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui";
import { validateTimelock } from "@/lib/quoteApi";
import type { TimelockValidation } from "@/types";

type TimelockPreset = "fast" | "standard" | "custom";

const MIN_TIMELOCK_HOURS = 1;
const MAX_TIMELOCK_HOURS = 168;
const PRESET_HOURS: Record<Exclude<TimelockPreset, "custom">, number> = {
  fast: 4,
  standard: 24,
};

const LEVEL_STYLES: Record<string, string> = {
  error: "border-red-500/20 bg-red-500/5 text-red-300",
  warning: "border-amber-500/20 bg-amber-500/5 text-amber-300",
  info: "border-blue-500/20 bg-blue-500/5 text-blue-300",
};

interface TimelockConfiguratorProps {
  sourceChain: string;
  destChain: string;
  timelockHours: number;
  onTimelockChange: (hours: number) => void;
}

export function TimelockConfigurator({
  sourceChain,
  destChain,
  timelockHours,
  onTimelockChange,
}: TimelockConfiguratorProps) {
  const [preset, setPreset] = useState<TimelockPreset>("standard");
  const [customHours, setCustomHours] = useState(String(timelockHours));
  const [customError, setCustomError] = useState<string | null>(null);
  const [validation, setValidation] = useState<TimelockValidation | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    if (timelockHours === PRESET_HOURS.fast) {
      setPreset("fast");
    } else if (timelockHours === PRESET_HOURS.standard) {
      setPreset("standard");
    } else {
      setPreset("custom");
      setCustomHours(String(timelockHours));
    }
  }, [timelockHours]);

  useEffect(() => {
    const timeLock = Math.floor(Date.now() / 1000) + timelockHours * 3600;
    let cancelled = false;

    setIsValidating(true);
    validateTimelock(timeLock, sourceChain, destChain)
      .then((result) => {
        if (!cancelled) {
          setValidation(result);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setValidation(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsValidating(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [destChain, sourceChain, timelockHours]);

  const helperText = useMemo(() => {
    if (preset === "fast") {
      return "Fast mode prioritizes speed, but leaves less recovery time if the counterparty stalls.";
    }
    if (preset === "standard") {
      return "Standard mode is the recommended default for balanced settlement and refund safety.";
    }
    return "Custom mode is for advanced users. Keep enough timeout gap for both chains to confirm.";
  }, [preset]);

  const applyPreset = (nextPreset: TimelockPreset) => {
    setPreset(nextPreset);
    if (nextPreset === "custom") {
      return;
    }
    setCustomError(null);
    onTimelockChange(PRESET_HOURS[nextPreset]);
  };

  const onCustomChange = (value: string) => {
    setCustomHours(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      setCustomError("Enter a numeric timelock in hours.");
      return;
    }
    if (parsed < MIN_TIMELOCK_HOURS || parsed > MAX_TIMELOCK_HOURS) {
      setCustomError(`Custom timelock must be between ${MIN_TIMELOCK_HOURS} and ${MAX_TIMELOCK_HOURS} hours.`);
      return;
    }
    setCustomError(null);
    onTimelockChange(parsed);
  };

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">Timelock Strategy</span>
        <Badge variant="info">Safety Presets</Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <button
          type="button"
          onClick={() => applyPreset("fast")}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
            preset === "fast"
              ? "border-brand-500 bg-brand-500/10 text-brand-500"
              : "border-border bg-surface-overlay/30 text-text-secondary"
          }`}
        >
          <p className="font-semibold">Fast</p>
          <p className="mt-1 text-xs">~4 hours</p>
        </button>
        <button
          type="button"
          onClick={() => applyPreset("standard")}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
            preset === "standard"
              ? "border-brand-500 bg-brand-500/10 text-brand-500"
              : "border-border bg-surface-overlay/30 text-text-secondary"
          }`}
        >
          <p className="font-semibold">Standard</p>
          <p className="mt-1 text-xs">~24 hours (recommended)</p>
        </button>
        <button
          type="button"
          onClick={() => applyPreset("custom")}
          className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
            preset === "custom"
              ? "border-brand-500 bg-brand-500/10 text-brand-500"
              : "border-border bg-surface-overlay/30 text-text-secondary"
          }`}
        >
          <p className="font-semibold">Custom</p>
          <p className="mt-1 text-xs">Advanced control</p>
        </button>
      </div>

      {preset === "custom" && (
        <div className="mt-4 space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">
            Custom Timelock (hours)
          </label>
          <input
            type="number"
            min={MIN_TIMELOCK_HOURS}
            max={MAX_TIMELOCK_HOURS}
            value={customHours}
            onChange={(event) => onCustomChange(event.target.value)}
            className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-text-primary"
          />
          {customError ? (
            <p className="text-xs text-red-300">{customError}</p>
          ) : (
            <p className="text-xs text-text-muted">
              Bounds: {MIN_TIMELOCK_HOURS}h minimum, {MAX_TIMELOCK_HOURS}h maximum.
            </p>
          )}
        </div>
      )}

      <p className="mt-4 text-xs text-text-secondary">{helperText}</p>

      {isValidating && <p className="mt-3 text-xs text-text-muted">Validating timelock safety...</p>}

      {!isValidating && validation?.warnings?.length ? (
        <div className="mt-3 space-y-2">
          {validation.warnings.map((warning, index) => (
            <div
              key={`${warning.level}-${index}`}
              className={`rounded-xl border p-3 text-xs ${LEVEL_STYLES[warning.level] || LEVEL_STYLES.info}`}
            >
              <p className="font-semibold">{warning.message}</p>
              {warning.recommendation && <p className="mt-1 opacity-90">{warning.recommendation}</p>}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
