"use client";

import { formatPercent, formatTokenAmount, formatTokenWithSymbol } from "@/lib/format";
import { useState } from "react";

interface RateQuote {
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  slippage_estimate: number;
  effective_rate: number;
}

interface CEXComparison {
  exchange: string;
  rate: number;
  fee_percent: number;
  total_receive: number;
  savings_vs_cex: number;
}

interface SwapRateCalculatorProps {
  fromAsset?: string;
  toAsset?: string;
  fromAmount?: number;
}

const MOCK_RATES: Record<string, Record<string, number>> = {
  XLM: { BTC: 0.0000023, ETH: 0.0000428, USDC: 0.15, SOL: 0.001 },
  BTC: { XLM: 433333.33, ETH: 18.57, USDC: 65000.0, SOL: 433.33 },
  ETH: { XLM: 23333.33, BTC: 0.0538, USDC: 3500.0, SOL: 23.33 },
  SOL: { XLM: 1000.0, BTC: 0.0023, ETH: 0.0428, USDC: 150.0 },
  USDC: { XLM: 6.67, BTC: 0.0000153, ETH: 0.000285, SOL: 0.00667 },
};

const CEX_FEES: Record<string, number> = {
  Binance: 0.1,
  Coinbase: 0.6,
  Kraken: 0.26,
};

export default function SwapRateCalculator({
  fromAsset = "XLM",
  toAsset = "ETH",
  fromAmount = 1000,
}: SwapRateCalculatorProps) {
  const [from, setFrom] = useState(fromAsset);
  const [to, setTo] = useState(toAsset);
  const [amount, setAmount] = useState(fromAmount);
  const [showComparison, setShowComparison] = useState(false);

  const assets = Object.keys(MOCK_RATES);
  const rate = MOCK_RATES[from]?.[to] ?? 0;
  const slippage = amount * (MOCK_RATES[from]?.USDC ?? 0) > 10000 ? 0.003 : 0.001;
  const effectiveRate = rate * (1 - slippage);
  const receiveAmount = amount * effectiveRate;

  const cexComparisons = Object.entries(CEX_FEES).map(([exchange, feePct]) => {
    const cexRate = rate * (1 - feePct / 100);
    const cexReceive = amount * cexRate;
    return {
      exchange,
      rate: cexRate,
      fee_percent: feePct,
      total_receive: cexReceive,
      savings: receiveAmount - cexReceive,
    };
  });

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-bold mb-4">Swap Rate Calculator</h3>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <select
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
          >
            {assets.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
            min="0"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <select
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 text-sm"
          >
            {assets.filter((a) => a !== from).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {rate > 0 ? (
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">Exchange Rate</span>
              <span className="font-mono">
                1 {from} = {formatTokenAmount(rate, { maximumFractionDigits: 8 })} {to}
              </span>
            </div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-500">
                Slippage ({formatPercent(slippage, { fractionDigits: 1 })})
              </span>
              <span className="font-mono text-yellow-600">
                -
                {formatTokenWithSymbol(amount * rate * slippage, to, { maximumFractionDigits: 8 })}
              </span>
            </div>
            <div className="flex justify-between text-sm font-semibold">
              <span>You Receive</span>
              <span className="font-mono text-green-600">
                {formatTokenWithSymbol(receiveAmount, to, { maximumFractionDigits: 8 })}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowComparison(!showComparison)}
            className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            {showComparison ? "Hide" : "Compare with"} CEX Rates
          </button>

          {showComparison && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-gray-500 px-2">
                <span>Exchange</span>
                <span>Fee</span>
                <span>You Receive</span>
                <span>vs ChainBridge</span>
              </div>
              <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex justify-between text-xs">
                <span className="font-medium">ChainBridge</span>
                <span>{formatPercent(slippage, { fractionDigits: 1 })}</span>
                <span className="font-mono">
                  {formatTokenAmount(receiveAmount, { maximumFractionDigits: 6 })}
                </span>
                <span className="text-green-600">-</span>
              </div>
              {cexComparisons.map((cex) => (
                <div
                  key={cex.exchange}
                  className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg flex justify-between text-xs"
                >
                  <span>{cex.exchange}</span>
                  <span>{cex.fee_percent}%</span>
                  <span className="font-mono">
                    {formatTokenAmount(cex.total_receive, { maximumFractionDigits: 6 })}
                  </span>
                  <span className={cex.savings > 0 ? "text-green-600" : "text-red-500"}>
                    {cex.savings > 0 ? "+" : ""}
                    {formatTokenAmount(cex.savings, { maximumFractionDigits: 6 })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No rate available for {from}/{to}.
        </p>
      )}
    </div>
  );
}
