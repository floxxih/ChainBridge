"use client";

import { AlertCircle } from "lucide-react";

// Slippage: default 0.5%, valid range 0.1%–50%
export const SLIPPAGE_DEFAULT = 0.5;
export const SLIPPAGE_MIN = 0.1;
export const SLIPPAGE_MAX = 50;

// Order expiration: default 30 minutes
export const EXPIRATION_DEFAULT_MINUTES = 30;

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0];

const EXPIRATION_OPTIONS: Array<{ label: string; value: number }> = [
  { label: "5 min", value: 5 },
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hr", value: 60 },
  { label: "24 hr", value: 1440 },
];

interface SlippageExpirationControlsProps {
  slippage: number;
  expirationMinutes: number;
  onSlippageChange: (value: number) => void;
  onExpirationChange: (value: number) => void;
}

export function SlippageExpirationControls({
  slippage,
  expirationMinutes,
  onSlippageChange,
  onExpirationChange,
}: SlippageExpirationControlsProps) {
  const slippageInvalid =
    Number.isNaN(slippage) || slippage < SLIPPAGE_MIN || slippage > SLIPPAGE_MAX;
  const slippageHigh = !slippageInvalid && slippage > 5;

  return (
    <div className="rounded-xl border border-border bg-background/60 p-4 space-y-5">
      <p className="text-sm font-medium text-text-primary">Slippage &amp; Expiration</p>

      {/* Slippage tolerance */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Slippage Tolerance</label>
          <span className="text-xs text-text-muted">Default: {SLIPPAGE_DEFAULT}%</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={SLIPPAGE_MIN}
              max={SLIPPAGE_MAX}
              step="0.1"
              value={Number.isNaN(slippage) ? "" : slippage}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                onSlippageChange(Number.isNaN(v) ? SLIPPAGE_DEFAULT : v);
              }}
              className="w-20 rounded-lg border border-border bg-surface-raised px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-500/50"
            />
            <span className="text-sm text-text-muted">%</span>
          </div>
          <div className="flex gap-1">
            {SLIPPAGE_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => onSlippageChange(preset)}
                className={`rounded-lg border px-2.5 py-1.5 text-xs transition ${
                  slippage === preset
                    ? "border-brand-500 bg-brand-500/10 text-brand-500"
                    : "border-border bg-surface-overlay/30 text-text-secondary hover:border-brand-500/30"
                }`}
              >
                {preset}%
              </button>
            ))}
          </div>
        </div>
        {slippageInvalid && (
          <p className="flex items-center gap-1.5 text-xs text-status-error">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Must be between {SLIPPAGE_MIN}% and {SLIPPAGE_MAX}%
          </p>
        )}
        {slippageHigh && (
          <p className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            High slippage — execution price may differ significantly
          </p>
        )}
      </div>

      {/* Order expiration */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-text-secondary">Order Expiration</label>
          <span className="text-xs text-text-muted">Default: 30 min</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {EXPIRATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onExpirationChange(opt.value)}
              className={`rounded-lg border px-3 py-1.5 text-xs transition ${
                expirationMinutes === opt.value
                  ? "border-brand-500 bg-brand-500/10 text-brand-500"
                  : "border-border bg-surface-overlay/30 text-text-secondary hover:border-brand-500/30"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
