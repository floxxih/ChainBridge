"use client";

import { Modal } from "@/components/ui/modal";
import { SwapReviewSummary } from "./SwapReviewSummary";

interface SwapReviewModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isConfirming: boolean;
  swapDetails: {
    fromAsset: string;
    fromChain: string;
    fromAmount: string;
    toAsset: string;
    toChain: string;
    toAmount: string;
    estimatedFees: string;
    timelockHours: number;
    route: string;
    slippage: number;
    expirationMinutes: number;
  };
}

export function SwapReviewModal({
  open,
  onClose,
  onConfirm,
  isConfirming,
  swapDetails,
}: SwapReviewModalProps) {
  return (
    <Modal
      open={open}
      onClose={isConfirming ? () => {} : onClose}
      size="md"
    >
      <div className="flex flex-col gap-4">
        <SwapReviewSummary
          onConfirm={onConfirm}
          onCancel={onClose}
          isConfirming={isConfirming}
          swapDetails={swapDetails}
        />

        {/* Slippage and expiration are part of the payload preview */}
        <div className="rounded-xl border border-border bg-surface-overlay/30 p-3 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">Slippage Tolerance</span>
            <span className="font-medium text-text-primary">{swapDetails.slippage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">Order Expiration</span>
            <span className="font-medium text-text-primary">
              {swapDetails.expirationMinutes >= 60
                ? `${swapDetails.expirationMinutes / 60} hr`
                : `${swapDetails.expirationMinutes} min`}
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
}
