import axios from "axios";

import config from "@/lib/config";
import type { RateQuote, SwapFeeBreakdown, TimelockValidation } from "@/types";

export interface QuoteRequest {
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  sourceChain: string;
  destChain: string;
}

export interface QuotePreview {
  rateQuote: RateQuote;
  feeBreakdown: SwapFeeBreakdown;
}

export async function fetchQuotePreview(request: QuoteRequest): Promise<QuotePreview> {
  const [rateQuote, feeBreakdown] = await Promise.all([
    axios.post<RateQuote>(`${config.api.url}/api/v1/market/rates/calculate`, {
      from_asset: request.fromAsset,
      to_asset: request.toAsset,
      from_amount: request.fromAmount,
      source_chain: request.sourceChain,
      dest_chain: request.destChain,
    }),
    axios.post<SwapFeeBreakdown>(`${config.api.url}/api/v1/market/fees/estimate`, {
      source_chain: request.sourceChain,
      dest_chain: request.destChain,
      amount: request.fromAmount,
      amount_asset: request.fromAsset,
    }),
  ]);

  return {
    rateQuote: rateQuote.data,
    feeBreakdown: feeBreakdown.data,
  };
}

export async function validateTimelock(
  timeLockUnix: number,
  sourceChain: string,
  destChain: string
): Promise<TimelockValidation> {
  const { data } = await axios.post<TimelockValidation>(
    `${config.api.url}/api/v1/timelock/validate`,
    {
      time_lock: timeLockUnix,
      source_chain: sourceChain,
      dest_chain: destChain,
    }
  );
  return data;
}
