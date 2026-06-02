import { FC } from "react";
import { TrendingUp, Clock, Users, Activity } from "lucide-react";
import { useProtocolMetrics } from "@/hooks/useProtocolAnalytics";
import { formatTokenAmount } from "@/lib/format/currency";

interface ProtocolAnalyticsPanelProps {
  className?: string;
}

export const ProtocolAnalyticsPanel: FC<ProtocolAnalyticsPanelProps> = ({ className }) => {
  const { data: metrics, isLoading, isError } = useProtocolMetrics();

  if (isLoading) {
    return (
      <div className={className}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-surface-raised rounded-lg animate-pulse">
              <div className="h-4 bg-surface-default rounded w-20 mb-2" />
              <div className="h-6 bg-surface-default rounded w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className={className}>
        <div className="p-4 bg-surface-raised rounded-lg text-center">
          <p className="text-sm text-content-secondary">
            Protocol analytics temporarily unavailable
          </p>
        </div>
      </div>
    );
  }

  const formatValue = (value: number) => {
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(2)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toString();
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    return `${Math.floor(seconds / 60)}m`;
  };

  return (
    <div className={className}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-surface-raised rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-4 h-4 text-content-secondary" />
            <span className="text-sm text-content-secondary">24h Volume</span>
          </div>
          <p className="text-xl font-semibold text-content-primary">
            ${formatValue(metrics.volume_24h)}
          </p>
        </div>

        <div className="p-4 bg-surface-raised rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-content-secondary" />
            <span className="text-sm text-content-secondary">Avg Time</span>
          </div>
          <p className="text-xl font-semibold text-content-primary">
            {formatTime(metrics.average_swap_time_seconds)}
          </p>
        </div>

        <div className="p-4 bg-surface-raised rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-content-secondary" />
            <span className="text-sm text-content-secondary">Active Users</span>
          </div>
          <p className="text-xl font-semibold text-content-primary">
            {formatValue(metrics.active_users_24h)}
          </p>
        </div>

        <div className="p-4 bg-surface-raised rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Activity className="w-4 h-4 text-content-secondary" />
            <span className="text-sm text-content-secondary">Success Rate</span>
          </div>
          <p className="text-xl font-semibold text-content-primary">
            {(metrics.success_rate * 100).toFixed(1)}%
          </p>
        </div>
      </div>
    </div>
  );
};
