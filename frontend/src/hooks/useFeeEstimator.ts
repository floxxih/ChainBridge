/**
 * React hook for using fee estimator adapters
 * Provides a unified interface for fee estimation across chains
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useQueryClient, UseQueryOptions } from "@tanstack/react-query";

import {
  FeeEstimate,
  FeeEstimatorAdapter,
  FeeAdapterFactory,
  FeeUtils,
  ChainInfo,
} from "@/lib/fees/adapters";

export interface UseFeeEstimatorOptions {
  chain: string;
  network?: "mainnet" | "testnet";
  autoRefresh?: boolean;
  refreshInterval?: number;
  enabled?: boolean;
}

export interface UseFeeEstimatorResult {
  // Current fee data
  fees: FeeEstimate | null;
  isLoading: boolean;
  error: Error | null;

  // Chain information
  chainInfo: ChainInfo | null;
  isHealthy: boolean;

  // Actions
  refetch: () => void;
  estimateFeeForConfirmation: (blocks: number) => Promise<number>;
  estimateTransactionCost: (gasUnits?: number, transactionSize?: number) => any;
  getFeeRecommendation: (urgency: "low" | "medium" | "high") => any;

  // Utilities
  convertFee: (amount: number, fromUnit: string, toUnit: string) => number;
}

export function useFeeEstimator(options: UseFeeEstimatorOptions): UseFeeEstimatorResult {
  const {
    chain,
    network = "testnet",
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enabled = true,
  } = options;

  const queryClient = useQueryClient();

  // Create adapter instance
  const adapter = useMemo(() => {
    try {
      return FeeAdapterFactory.getAdapter(chain, network);
    } catch (error) {
      console.error(`Failed to create fee adapter for ${chain}:`, error);
      return null;
    }
  }, [chain, network]);

  // Query for current fees
  const {
    data: fees,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["fee-estimate", chain, network],
    queryFn: async () => {
      if (!adapter) throw new Error("Adapter not available");
      return adapter.getCurrentFees();
    },
    enabled: enabled && !!adapter,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 15000, // 15 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Query for adapter health
  const { data: isHealthy } = useQuery({
    queryKey: ["fee-adapter-health", chain, network],
    queryFn: async () => {
      if (!adapter) return false;
      return adapter.isHealthy();
    },
    enabled: enabled && !!adapter,
    refetchInterval: 60000, // 1 minute
    retry: 1,
  });

  // Get chain info
  const chainInfo = useMemo(() => {
    return adapter?.getChainInfo() || null;
  }, [adapter]);

  // Estimate fee for confirmation blocks
  const estimateFeeForConfirmation = useCallback(
    async (blocks: number) => {
      if (!adapter) throw new Error("Adapter not available");
      return adapter.estimateFeeForConfirmation(blocks);
    },
    [adapter]
  );

  // Estimate transaction cost
  const estimateTransactionCost = useCallback(
    (gasUnits?: number, transactionSize?: number) => {
      if (!fees) throw new Error("Fee data not available");
      return FeeUtils.estimateTransactionCost(fees, gasUnits, transactionSize);
    },
    [fees]
  );

  // Get fee recommendation
  const getFeeRecommendation = useCallback(
    (urgency: "low" | "medium" | "high") => {
      if (!fees) throw new Error("Fee data not available");
      return FeeUtils.getFeeRecommendation(fees, urgency);
    },
    [fees]
  );

  // Convert fee units
  const convertFee = useCallback(
    (amount: number, fromUnit: string, toUnit: string) => {
      if (!fees) throw new Error("Fee data not available");
      return FeeUtils.convertFee(amount, fromUnit, toUnit, fees.feeDecimals);
    },
    [fees]
  );

  return {
    fees,
    isLoading,
    error,
    chainInfo,
    isHealthy: isHealthy || false,
    refetch,
    estimateFeeForConfirmation,
    estimateTransactionCost,
    getFeeRecommendation,
    convertFee,
  };
}

// Hook for multiple chains
export function useMultiChainFeeEstimator(
  chains: string[],
  network: "mainnet" | "testnet" = "testnet"
) {
  const results = useMemo(() => {
    return chains.reduce(
      (acc, chain) => {
        acc[chain] = useFeeEstimator({ chain, network });
        return acc;
      },
      {} as Record<string, UseFeeEstimatorResult>
    );
  }, [chains, network]);

  // Aggregate state
  const isLoading = useMemo(
    () => Object.values(results).some((result) => result.isLoading),
    [results]
  );

  const hasError = useMemo(
    () => Object.values(results).some((result) => result.error !== null),
    [results]
  );

  const healthyChains = useMemo(
    () =>
      Object.entries(results)
        .filter(([_, result]) => result.isHealthy)
        .map(([chain]) => chain),
    [results]
  );

  const unhealthyChains = useMemo(
    () =>
      Object.entries(results)
        .filter(([_, result]) => !result.isHealthy)
        .map(([chain]) => chain),
    [results]
  );

  return {
    results,
    isLoading,
    hasError,
    healthyChains,
    unhealthyChains,
    refetchAll: () => {
      Object.values(results).forEach((result) => result.refetch());
    },
  };
}

// Hook for fee comparison across chains
export function useFeeComparison(chains: string[], network: "mainnet" | "testnet" = "testnet") {
  const { results, isLoading, hasError } = useMultiChainFeeEstimator(chains, network);

  const comparison = useMemo(() => {
    if (isLoading || hasError) return null;

    return chains
      .map((chain) => {
        const result = results[chain];
        if (!result.fees || !result.chainInfo) return null;

        const { fees, chainInfo } = result;
        const avgCost = FeeUtils.estimateTransactionCost(fees);

        return {
          chain,
          chainInfo,
          fees,
          averageCost: avgCost.averageCost,
          currency: avgCost.currency,
          congestionLevel: fees.congestionLevel,
          isHealthy: result.isHealthy,
        };
      })
      .filter(Boolean) as Array<{
      chain: string;
      chainInfo: ChainInfo;
      fees: FeeEstimate;
      averageCost: number;
      currency: string;
      congestionLevel: number;
      isHealthy: boolean;
    }>;
  }, [results, chains, isLoading, hasError]);

  // Sort by cost (lowest first)
  const sortedByCost = useMemo(() => {
    if (!comparison) return [];
    return [...comparison].sort((a, b) => a.averageCost - b.averageCost);
  }, [comparison]);

  // Sort by congestion (lowest first)
  const sortedByCongestion = useMemo(() => {
    if (!comparison) return [];
    return [...comparison].sort((a, b) => a.congestionLevel - b.congestionLevel);
  }, [comparison]);

  // Get cheapest chain
  const cheapestChain = useMemo(() => sortedByCost[0] || null, [sortedByCost]);

  // Get least congested chain
  const leastCongestedChain = useMemo(() => sortedByCongestion[0] || null, [sortedByCongestion]);

  return {
    comparison,
    sortedByCost,
    sortedByCongestion,
    cheapestChain,
    leastCongestedChain,
    isLoading,
    hasError,
  };
}

// Hook for fee history and trends
export function useFeeHistory(
  chain: string,
  network: "mainnet" | "testnet" = "testnet",
  hours: number = 24
) {
  const queryClient = useQueryClient();

  const {
    data: history,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["fee-history", chain, network, hours],
    queryFn: async () => {
      // This would integrate with a fee history API
      // For now, return mock historical data
      const adapter = FeeAdapterFactory.getAdapter(chain, network);
      const currentFees = await adapter.getCurrentFees();

      // Generate mock historical data points
      const points = Math.min(hours, 24); // One point per hour max
      const history = [];

      for (let i = points - 1; i >= 0; i--) {
        const timestamp = Date.now() - i * 60 * 60 * 1000;
        const variance = 0.8 + Math.random() * 0.4; // ±20% variance

        history.push({
          timestamp,
          slowFee: Math.round(currentFees.slowFee * variance),
          averageFee: Math.round(currentFees.averageFee * variance),
          fastFee: Math.round(currentFees.fastFee * variance),
          congestionLevel: Math.min(
            100,
            Math.max(0, currentFees.congestionLevel + (Math.random() * 20 - 10))
          ),
        });
      }

      return history;
    },
    enabled: !!chain,
    refetchInterval: 300000, // 5 minutes
    staleTime: 240000, // 4 minutes
  });

  // Calculate trends
  const trends = useMemo(() => {
    if (!history || history.length < 2) return null;

    const latest = history[history.length - 1];
    const previous = history[history.length - 2];

    return {
      averageFee: {
        current: latest.averageFee,
        previous: previous.averageFee,
        change: latest.averageFee - previous.averageFee,
        changePercent: ((latest.averageFee - previous.averageFee) / previous.averageFee) * 100,
      },
      congestion: {
        current: latest.congestionLevel,
        previous: previous.congestionLevel,
        change: latest.congestionLevel - previous.congestionLevel,
        changePercent:
          ((latest.congestionLevel - previous.congestionLevel) / previous.congestionLevel) * 100,
      },
    };
  }, [history]);

  return {
    history,
    trends,
    isLoading,
    error,
  };
}

// Hook for fee alerts and notifications
export function useFeeAlerts(
  chain: string,
  network: "mainnet" | "testnet" = "testnet",
  thresholds?: {
    highFee?: number;
    highCongestion?: number;
  }
) {
  const { fees, isLoading } = useFeeEstimator({ chain, network });

  const alerts = useMemo(() => {
    if (!fees || isLoading) return [];

    const alerts = [];
    const { highFee = 100, highCongestion = 80 } = thresholds || {};

    // High fee alert
    if (fees.averageFee > highFee) {
      alerts.push({
        type: "high-fee" as const,
        severity: "warning" as const,
        message: `High fees detected: ${fees.averageFee} ${fees.feeUnit}`,
        value: fees.averageFee,
        threshold: highFee,
      });
    }

    // High congestion alert
    if (fees.congestionLevel > highCongestion) {
      alerts.push({
        type: "high-congestion" as const,
        severity: "error" as const,
        message: `Network congestion: ${fees.congestionLevel}%`,
        value: fees.congestionLevel,
        threshold: highCongestion,
      });
    }

    return alerts;
  }, [fees, isLoading, thresholds]);

  const hasAlerts = alerts.length > 0;
  const hasWarnings = alerts.some((alert) => alert.severity === "warning");
  const hasErrors = alerts.some((alert) => alert.severity === "error");

  return {
    alerts,
    hasAlerts,
    hasWarnings,
    hasErrors,
    criticalAlert: alerts.find((alert) => alert.severity === "error"),
  };
}
