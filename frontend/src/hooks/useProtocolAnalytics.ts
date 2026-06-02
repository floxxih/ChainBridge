import { useQuery } from "@tanstack/react-query";
import { getProtocolMetrics, getRoutingAnalytics, getSwapAnalytics } from "@/lib/api/analytics";
import type { ProtocolMetrics, RoutingAnalytics, SwapAnalytics } from "@/lib/api/analytics";

/**
 * Hook to fetch live protocol metrics
 * Includes TVL, 24h volume, active users, and success rate
 */
export function useProtocolMetrics() {
  return useQuery<ProtocolMetrics>({
    queryKey: ["protocol", "metrics"],
    queryFn: () => getProtocolMetrics(),
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

/**
 * Hook to fetch routing analytics for a specific chain pair
 */
export function useRoutingAnalytics(sourceChain: string, targetChain: string) {
  return useQuery<RoutingAnalytics>({
    queryKey: ["routing", "analytics", sourceChain, targetChain],
    queryFn: () => getRoutingAnalytics(sourceChain, targetChain),
    enabled: Boolean(sourceChain && targetChain),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch analytics for a specific swap
 */
export function useSwapAnalytics(swapId: number | null) {
  return useQuery<SwapAnalytics>({
    queryKey: ["swap", "analytics", swapId],
    queryFn: () => getSwapAnalytics(swapId!),
    enabled: Boolean(swapId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
