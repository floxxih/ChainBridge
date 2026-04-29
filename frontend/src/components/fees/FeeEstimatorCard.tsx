"use client";

import { useMemo } from "react";
import { TrendingUp, TrendingDown, AlertTriangle, Info, Zap, Clock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useFeeEstimator, useFeeHistory, useFeeAlerts } from "@/hooks/useFeeEstimator";
import { useSettingsStore } from "@/hooks/useSettings";
import { useI18n } from "@/components/i18n/I18nProvider";

interface FeeEstimatorCardProps {
  chain: string;
  network?: "mainnet" | "testnet";
  showHistory?: boolean;
  showAlerts?: boolean;
  compact?: boolean;
}

export function FeeEstimatorCard({
  chain,
  network = "testnet",
  showHistory = true,
  showAlerts = true,
  compact = false,
}: FeeEstimatorCardProps) {
  const { t } = useI18n();
  const { fees, isLoading, error, chainInfo, isHealthy, getFeeRecommendation } = useFeeEstimator({
    chain,
    network,
  });

  const { trends } = useFeeHistory(chain, network);
  const { alerts, hasAlerts } = useFeeAlerts(chain, network);

  const currency = useMemo(() => {
    if (!chainInfo) return "";
    switch (chainInfo.nativeCurrency) {
      case "XLM":
        return "XLM";
      case "BTC":
        return "BTC";
      case "ETH":
        return "ETH";
      default:
        return chainInfo.nativeCurrency;
    }
  }, [chainInfo]);

  if (isLoading) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-muted rounded w-1/3"></div>
          <div className="space-y-2">
            <div className="h-3 bg-muted rounded w-full"></div>
            <div className="h-3 bg-muted rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !fees || !chainInfo) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-center gap-2 text-red-800">
          <AlertTriangle className="h-4 w-4" />
          <span className="text-sm font-medium">
            {error ? t("fees.errorLoading") : t("fees.noData")}
          </span>
        </div>
      </div>
    );
  }

  const feeTrend = trends?.averageFee;
  const isTrendingUp = feeTrend && feeTrend.change > 0;
  const isTrendingDown = feeTrend && feeTrend.change < 0;

  const urgencyRecommendations = [
    { urgency: "low" as const, label: t("fees.urgency.low"), icon: Clock },
    { urgency: "medium" as const, label: t("fees.urgency.medium"), icon: Zap },
    { urgency: "high" as const, label: t("fees.urgency.high"), icon: Info },
  ];

  if (compact) {
    return (
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{chainInfo.name}</span>
              <StatusBadge status={isHealthy ? "completed" : "failed"} size="sm" />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-lg font-semibold">
                {fees.averageFee} {fees.feeUnit}
              </span>
              {feeTrend && (
                <div
                  className={`flex items-center gap-1 text-xs ${
                    isTrendingUp
                      ? "text-red-600"
                      : isTrendingDown
                        ? "text-green-600"
                        : "text-gray-600"
                  }`}
                >
                  {isTrendingUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : isTrendingDown ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {Math.abs(feeTrend.changePercent).toFixed(1)}%
                </div>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">
              {t("fees.congestion")}: {fees.congestionLevel}%
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h3 className="text-lg font-semibold">{chainInfo.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={isHealthy ? "completed" : "failed"} size="sm" showIcon>
                {isHealthy ? t("fees.healthy") : t("fees.unhealthy")}
              </StatusBadge>
              <span className="text-sm text-muted-foreground">
                {network === "mainnet" ? t("common.mainnet") : t("common.testnet")}
              </span>
            </div>
          </div>
        </div>

        {feeTrend && (
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isTrendingUp
                ? "bg-red-100 text-red-800"
                : isTrendingDown
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {isTrendingUp ? (
              <TrendingUp className="h-4 w-4" />
            ) : isTrendingDown ? (
              <TrendingDown className="h-4 w-4" />
            ) : null}
            <span>
              {isTrendingUp ? "+" : ""}
              {feeTrend.changePercent.toFixed(1)}%
            </span>
          </div>
        )}
      </div>

      {/* Current Fees */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">{t("fees.slow")}</div>
          <div className="text-lg font-semibold">{fees.slowFee}</div>
          <div className="text-xs text-muted-foreground">{fees.feeUnit}</div>
        </div>
        <div className="text-center p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="text-xs text-muted-foreground mb-1">{t("fees.average")}</div>
          <div className="text-lg font-semibold text-primary">{fees.averageFee}</div>
          <div className="text-xs text-muted-foreground">{fees.feeUnit}</div>
        </div>
        <div className="text-center p-3 bg-muted/50 rounded-lg">
          <div className="text-xs text-muted-foreground mb-1">{t("fees.fast")}</div>
          <div className="text-lg font-semibold">{fees.fastFee}</div>
          <div className="text-xs text-muted-foreground">{fees.feeUnit}</div>
        </div>
      </div>

      {/* Network Status */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-4">
          <div>
            <div className="text-sm text-muted-foreground">{t("fees.congestion")}</div>
            <div className="text-lg font-semibold">{fees.congestionLevel}%</div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground">{t("fees.blockTime")}</div>
            <div className="text-lg font-semibold">{fees.blockTime}s</div>
          </div>
        </div>

        <div className="w-32">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                fees.congestionLevel > 80
                  ? "bg-red-500"
                  : fees.congestionLevel > 60
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${fees.congestionLevel}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fee Recommendations */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-muted-foreground">{t("fees.recommendations")}</div>
        <div className="grid grid-cols-3 gap-2">
          {urgencyRecommendations.map(({ urgency, label, icon: Icon }) => {
            const recommendation = getFeeRecommendation(urgency);
            return (
              <div
                key={urgency}
                className="flex items-center gap-2 p-2 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                title={`${label} - ${t("fees.estimatedTime")}: ${recommendation.estimatedTime}s`}
              >
                <Icon className="h-3 w-3 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {recommendation.fee} {fees.feeUnit}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      {showAlerts && hasAlerts && (
        <div className="space-y-2">
          {alerts.map((alert, index) => (
            <div
              key={index}
              className={`flex items-start gap-2 p-3 rounded-lg ${
                alert.severity === "error"
                  ? "bg-red-50 border border-red-200"
                  : "bg-yellow-50 border border-yellow-200"
              }`}
            >
              <AlertTriangle
                className={`h-4 w-4 mt-0.5 ${
                  alert.severity === "error" ? "text-red-600" : "text-yellow-600"
                }`}
              />
              <div className="flex-1">
                <div
                  className={`text-sm font-medium ${
                    alert.severity === "error" ? "text-red-800" : "text-yellow-800"
                  }`}
                >
                  {alert.message}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {t("fees.threshold")}: {alert.threshold}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" size="sm">
          {t("fees.viewDetails")}
        </Button>
        <Button variant="ghost" size="sm">
          {t("fees.refresh")}
        </Button>
      </div>
    </div>
  );
}

// Multi-chain fee comparison component
interface FeeComparisonProps {
  chains: string[];
  network?: "mainnet" | "testnet";
  sortBy?: "cost" | "congestion";
  limit?: number;
}

export function FeeComparison({
  chains,
  network = "testnet",
  sortBy = "cost",
  limit = 3,
}: FeeComparisonProps) {
  const { t } = useI18n();
  const { sortedByCost, sortedByCongestion, isLoading } = useFeeComparison(chains, network);

  const sortedChains = sortBy === "cost" ? sortedByCost : sortedByCongestion;
  const displayChains = sortedChains?.slice(0, limit) || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-20 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t("fees.comparison")}</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={sortBy === "cost" ? "default" : "outline"}
            size="sm"
            onClick={() => {} /* Handle sort change */}
          >
            {t("fees.sortByCost")}
          </Button>
          <Button
            variant={sortBy === "congestion" ? "default" : "outline"}
            size="sm"
            onClick={() => {} /* Handle sort change */}
          >
            {t("fees.sortByCongestion")}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        {displayChains.map((chain, index) => (
          <div
            key={chain.chain}
            className="flex items-center justify-between p-4 border rounded-lg bg-card"
          >
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{chain.chainInfo.name}</div>
                <div className="text-sm text-muted-foreground">
                  {chain.averageCost.toFixed(6)} {chain.currency}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-sm font-medium">
                {chain.fees.averageFee} {chain.fees.feeUnit}
              </div>
              <div className="text-xs text-muted-foreground">
                {t("fees.congestion")}: {chain.congestionLevel}%
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
