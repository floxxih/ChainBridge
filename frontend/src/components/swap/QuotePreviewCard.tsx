"use client";

import { RefreshCw } from "lucide-react";

import { Badge, Button, Card } from "@/components/ui";
import type { QuotePreview } from "@/lib/quoteApi";

interface QuotePreviewCardProps {
  quote: QuotePreview | null;
  fromAsset: string;
  toAsset: string;
  isLoading: boolean;
  isStale: boolean;
  error: string | null;
  onRefresh: () => void;
}

function formatAmount(value: number, symbol: string) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  })} ${symbol}`;
}

function sumComponentsByName(
  quote: QuotePreview,
  names: string[]
): Array<{ name: string; amount: number; asset: string }> {
  const components = [
    ...quote.feeBreakdown.source_chain_fee.components,
    ...quote.feeBreakdown.dest_chain_fee.components,
    quote.feeBreakdown.relayer_fee,
  ];

  return components
    .filter((component) => names.includes(component.name))
    .map((component) => ({
      name: component.name,
      amount: component.amount,
      asset: component.asset,
    }));
}

function estimateInToAsset(
  amount: number,
  asset: string,
  fromAsset: string,
  toAsset: string,
  quote: QuotePreview
): number | null {
  if (asset === toAsset) {
    return amount;
  }
  if (asset === fromAsset) {
    return amount * quote.rateQuote.effective_rate;
  }
  return null;
}

export function QuotePreviewCard({
  quote,
  fromAsset,
  toAsset,
  isLoading,
  isStale,
  error,
  onRefresh,
}: QuotePreviewCardProps) {
  const networkFees = quote ? sumComponentsByName(quote, ["network_fee"]) : [];
  const protocolFees = quote ? sumComponentsByName(quote, ["contract_fee", "relayer_fee"]) : [];

  let networkFeeInToAsset = 0;
  let protocolFeeInToAsset = 0;
  let unconvertedCount = 0;

  if (quote) {
    for (const fee of [...networkFees, ...protocolFees]) {
      const converted = estimateInToAsset(fee.amount, fee.asset, fromAsset, toAsset, quote);
      if (converted === null) {
        unconvertedCount += 1;
        continue;
      }
      if (fee.name === "network_fee") {
        networkFeeInToAsset += converted;
      } else {
        protocolFeeInToAsset += converted;
      }
    }
  }

  const grossReceive = quote?.rateQuote.to_amount ?? 0;
  const netReceive = Math.max(grossReceive - networkFeeInToAsset - protocolFeeInToAsset, 0);

  return (
    <Card variant="glass" className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Quote Preview</p>
          <p className="text-xs text-text-muted">Expected output, rate, and fee breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          {isStale && <Badge variant="warning">Stale Quote</Badge>}
          <Button
            variant="secondary"
            size="sm"
            icon={<RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />}
            onClick={onRefresh}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
          {error}
        </div>
      ) : null}

      {!quote && !error ? (
        <p className="text-sm text-text-secondary">
          Enter an amount to generate a quote preview before submitting.
        </p>
      ) : null}

      {quote ? (
        <div className="space-y-3 text-sm">
          <div className="rounded-xl border border-border bg-surface-overlay/40 p-3">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Gross receive</span>
              <span className="font-semibold text-text-primary">{formatAmount(grossReceive, toAsset)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-text-muted">Estimated net receive</span>
              <span className="font-semibold text-emerald-400">{formatAmount(netReceive, toAsset)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-overlay/40 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-text-muted">Rate</span>
              <span className="font-medium text-text-primary">
                1 {fromAsset} ~= {quote.rateQuote.effective_rate.toFixed(8)} {toAsset}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Slippage estimate</span>
              <span className="text-text-primary">{(quote.rateQuote.slippage_estimate * 100).toFixed(2)}%</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface-overlay/40 p-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-text-muted">Fees</p>
            <div className="space-y-1 text-xs">
              {networkFees.map((fee, index) => (
                <div key={`network-${index}`} className="flex items-center justify-between text-text-secondary">
                  <span>Network: {fee.asset}</span>
                  <span>{fee.amount.toFixed(8)} {fee.asset}</span>
                </div>
              ))}
              {protocolFees.map((fee, index) => (
                <div key={`protocol-${index}`} className="flex items-center justify-between text-text-secondary">
                  <span>Protocol: {fee.name.replace("_", " ")}</span>
                  <span>{fee.amount.toFixed(8)} {fee.asset}</span>
                </div>
              ))}
            </div>
          </div>

          {isStale && (
            <p className="text-xs text-amber-300">
              Quote is older than 30s and may not reflect current fees/rates.
            </p>
          )}

          {unconvertedCount > 0 && (
            <p className="text-xs text-text-muted">
              {unconvertedCount} fee component(s) could not be converted into {toAsset} for net estimation.
            </p>
          )}
        </div>
      ) : null}
    </Card>
  );
}
