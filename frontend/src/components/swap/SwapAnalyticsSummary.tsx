import { FC } from "react";
import { useSwapAnalytics } from "@/hooks/useProtocolAnalytics";
import { ArrowRight, Clock, DollarSign, Gift } from "lucide-react";

interface SwapAnalyticsSummaryProps {
  swapId: number | null;
  className?: string;
}

export const SwapAnalyticsSummary: FC<SwapAnalyticsSummaryProps> = ({ swapId, className }) => {
  const { data: analytics, isLoading } = useSwapAnalytics(swapId);

  if (!swapId || isLoading) {
    return (
      <div className={className}>
        <div className="p-4 bg-surface-raised rounded-lg animate-pulse">
          <div className="h-4 bg-surface-default rounded w-32 mb-3" />
          <div className="space-y-2">
            <div className="h-3 bg-surface-default rounded w-full" />
            <div className="h-3 bg-surface-default rounded w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.found) {
    return (
      <div className={className}>
        <div className="p-4 bg-surface-raised rounded-lg">
          <p className="text-sm text-content-secondary text-center">
            Swap analytics not available yet
          </p>
        </div>
      </div>
    );
  }

  const { routing, fees, referral } = analytics;

  return (
    <div className={className}>
      <div className="space-y-4">
        {/* Routing Information */}
        {routing && (
          <div className="p-4 bg-surface-raised rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <ArrowRight className="w-4 h-4 text-content-secondary" />
              <h3 className="text-sm font-medium text-content-primary">Routing</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-content-secondary">Route</span>
                <span className="text-content-primary font-medium">
                  {routing.source_chain} → {routing.target_chain}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Type</span>
                <span className="text-content-primary capitalize">{routing.route_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Hops</span>
                <span className="text-content-primary">{routing.hops}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-content-secondary">Est. Time</span>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-content-secondary" />
                  <span className="text-content-primary">
                    {Math.floor(routing.estimated_time_seconds / 60)}m
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fee Breakdown */}
        {fees && (
          <div className="p-4 bg-surface-raised rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="w-4 h-4 text-content-secondary" />
              <h3 className="text-sm font-medium text-content-primary">Fees</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-content-secondary">Network Fee</span>
                <span className="text-content-primary">
                  {fees.network_fee.toLocaleString()} {fees.fee_currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Protocol Fee</span>
                <span className="text-content-primary">
                  {fees.protocol_fee.toLocaleString()} {fees.fee_currency}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t border-border-default">
                <span className="text-content-primary font-medium">Total Fees</span>
                <span className="text-content-primary font-medium">
                  {fees.total_fee.toLocaleString()} {fees.fee_currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Referral Information */}
        {referral && (
          <div className="p-4 bg-surface-raised rounded-lg border border-accent-primary/20">
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-accent-primary" />
              <h3 className="text-sm font-medium text-content-primary">Referral Bonus</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-content-secondary">Code</span>
                <span className="text-accent-primary font-medium">{referral.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-content-secondary">Your Reward</span>
                <span className="text-accent-primary font-medium">
                  {referral.reward_amount} {referral.reward_currency}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Fallback when no data */}
        {!routing && !fees && !referral && (
          <div className="p-4 bg-surface-raised rounded-lg">
            <p className="text-sm text-content-secondary text-center">
              Detailed analytics will appear here once the swap is initiated
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
