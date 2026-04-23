import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/badge";
import { ArrowDown } from "lucide-react";

interface SwapReviewProps {
  onConfirm: () => void;
  onCancel: () => void;
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
  };
}

export function SwapReviewSummary({ onConfirm, onCancel, isConfirming, swapDetails }: SwapReviewProps) {
  return (
    <div className="flex flex-col gap-6 p-1">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-semibold text-text-primary">Review Swap</h3>
        <p className="text-sm text-text-secondary">Please confirm the details below</p>
      </div>

      <div className="relative rounded-2xl border border-border bg-surface-overlay p-4">
        <div className="flex justify-between items-center pb-4 border-b border-border/50">
          <div>
            <p className="text-sm text-text-secondary mb-1">Pay</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-text-primary">{swapDetails.fromAmount}</span>
              <Badge variant="outline">{swapDetails.fromAsset}</Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">on {swapDetails.fromChain}</p>
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 -ml-4 -mt-4 flex h-8 w-8 items-center justify-center rounded-full border-4 border-surface-overlay bg-surface-raised text-text-secondary">
          <ArrowDown className="h-4 w-4" />
        </div>

        <div className="flex justify-between items-center pt-4">
          <div>
            <p className="text-sm text-text-secondary mb-1">Receive</p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-semibold text-text-primary">{swapDetails.toAmount}</span>
              <Badge variant="outline">{swapDetails.toAsset}</Badge>
            </div>
            <p className="text-xs text-text-muted mt-1">on {swapDetails.toChain}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-xl bg-surface-raised p-4 text-sm">
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Route</span>
          <span className="font-medium text-text-primary">{swapDetails.route}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">Estimated Fees</span>
          <span className="font-medium text-text-primary">{swapDetails.estimatedFees}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-text-secondary">HTLC Timelock</span>
          <span className="font-medium text-text-primary">{swapDetails.timelockHours} Hours</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="secondary" className="flex-1" onClick={onCancel} disabled={isConfirming}>
          Cancel
        </Button>
        <Button variant="primary" className="flex-1" onClick={onConfirm} loading={isConfirming}>
          Confirm Swap
        </Button>
      </div>
    </div>
  );
}
