import { createApiClient, getUserApiHeaders } from "@/lib/api/client";
import { z } from "zod";

const analyticsClient = createApiClient({
  basePath: "/analytics",
  getHeaders: getUserApiHeaders,
});

// Schemas
export const SwapRoutingDataSchema = z.object({
  source_chain: z.string(),
  target_chain: z.string(),
  route_type: z.string(),
  hops: z.number(),
  estimated_time_seconds: z.number(),
});

export const SwapFeesDataSchema = z.object({
  network_fee: z.number(),
  protocol_fee: z.number(),
  total_fee: z.number(),
  fee_currency: z.string(),
});

export const SwapAnalyticsSchema = z.object({
  swap_id: z.number(),
  found: z.boolean(),
  routing: SwapRoutingDataSchema.nullable(),
  fees: SwapFeesDataSchema.nullable(),
  referral: z.any().nullable(),
  status: z.string().optional(),
  created_at: z.string().nullable().optional(),
});

export const ProtocolMetricsSchema = z.object({
  tvl: z.number(),
  volume_24h: z.number(),
  active_users_24h: z.number(),
  average_swap_time_seconds: z.number(),
  total_swaps: z.number(),
  success_rate: z.number(),
  timestamp: z.string(),
});

export const RoutingAnalyticsSchema = z.object({
  source_chain: z.string(),
  target_chain: z.string(),
  total_swaps: z.number(),
  average_time_seconds: z.number(),
  available: z.boolean(),
  liquidity_depth: z.enum(["high", "medium", "low"]),
});

// Types
export type SwapRoutingData = z.infer<typeof SwapRoutingDataSchema>;
export type SwapFeesData = z.infer<typeof SwapFeesDataSchema>;
export type SwapAnalytics = z.infer<typeof SwapAnalyticsSchema>;
export type ProtocolMetrics = z.infer<typeof ProtocolMetricsSchema>;
export type RoutingAnalytics = z.infer<typeof RoutingAnalyticsSchema>;

// API Functions
export function getSwapAnalytics(swapId: number) {
  return analyticsClient.get<SwapAnalytics>(
    `/swap-analytics/${swapId}`,
    undefined,
    SwapAnalyticsSchema
  );
}

export function getProtocolMetrics() {
  return analyticsClient.get<ProtocolMetrics>(
    "/protocol-metrics",
    undefined,
    ProtocolMetricsSchema
  );
}

export function getRoutingAnalytics(sourceChain: string, targetChain: string) {
  return analyticsClient.get<RoutingAnalytics>(
    "/routing-analytics",
    {
      params: {
        source_chain: sourceChain,
        target_chain: targetChain,
      },
    },
    RoutingAnalyticsSchema
  );
}
