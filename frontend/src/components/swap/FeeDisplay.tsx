"use client";

import { useState, useEffect } from "react";

type Chain = "stellar" | "bitcoin" | "ethereum" | "solana";

interface FeeComponent {
  name: string;
  amount: number;
  asset: string;
  description: string;
}

interface ChainFee {
  chain: string;
  total_fee: number;
  asset: string;
  components: FeeComponent[];
}

interface FeeDisplayProps {
  sourceChain: Chain;
  destChain: Chain;
  amount?: number;
}

const CHAIN_FEES: Record<Chain, { base_fee: number; contract_fee: number; asset: string }> = {
  stellar: { base_fee: 0.00001, asset: "XLM", contract_fee: 0.001 },
  bitcoin: { base_fee: 0.0001, asset: "BTC", contract_fee: 0.0002 },
  ethereum: { base_fee: 0.002, asset: "ETH", contract_fee: 0.005 },
  solana: { base_fee: 0.000005, asset: "SOL", contract_fee: 0.0001 },
};

const RELAYER_FEE_PERCENT = 0.001;

export default function FeeDisplay({ sourceChain, destChain, amount }: FeeDisplayProps) {
  const srcFee = CHAIN_FEES[sourceChain];
  const dstFee = CHAIN_FEES[destChain];

  if (!srcFee || !dstFee) return null;

  const srcTotal = srcFee.base_fee + srcFee.contract_fee;
  const dstTotal = dstFee.base_fee + dstFee.contract_fee;
  const relayerFee = amount ? Math.max(amount * RELAYER_FEE_PERCENT, 0.5) : 0;

  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg mb-4">
      <h4 className="text-sm font-semibold mb-3 text-gray-700 dark:text-gray-300">
        Fee Breakdown
      </h4>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Source ({sourceChain})</span>
          <span className="font-mono">
            {srcTotal.toFixed(6)} {srcFee.asset}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 ml-4">
          <span>Network fee</span>
          <span>{srcFee.base_fee.toFixed(6)} {srcFee.asset}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 ml-4">
          <span>Contract fee</span>
          <span>{srcFee.contract_fee.toFixed(6)} {srcFee.asset}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-500">Destination ({destChain})</span>
          <span className="font-mono">
            {dstTotal.toFixed(6)} {dstFee.asset}
          </span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 ml-4">
          <span>Network fee</span>
          <span>{dstFee.base_fee.toFixed(6)} {dstFee.asset}</span>
        </div>
        <div className="flex justify-between text-xs text-gray-400 ml-4">
          <span>Contract fee</span>
          <span>{dstFee.contract_fee.toFixed(6)} {dstFee.asset}</span>
        </div>

        {amount && amount > 0 && (
          <>
            <hr className="border-gray-200 dark:border-gray-600" />
            <div className="flex justify-between">
              <span className="text-gray-500">Relayer fee (0.1%)</span>
              <span className="font-mono">${relayerFee.toFixed(2)} USD</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
