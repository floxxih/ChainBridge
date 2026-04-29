/**
 * Zod schemas for runtime validation of API responses.
 * Ensures type safety and guards against malformed payloads.
 */
import { z } from "zod";

// ── Order Schemas ──────────────────────────────────────────────────────────────

export const ApiOrderRecordSchema = z.object({
  id: z.string(),
  onchain_id: z.number().nullable(),
  creator: z.string(),
  from_chain: z.string(),
  to_chain: z.string(),
  from_asset: z.string(),
  to_asset: z.string(),
  from_amount: z.number(),
  to_amount: z.number(),
  min_fill_amount: z.number().nullable(),
  filled_amount: z.number(),
  expiry: z.number(),
  status: z.string(),
  counterparty: z.string().nullable(),
  created_at: z.string().nullable(),
});

export const ApiOrderListSchema = z.array(ApiOrderRecordSchema);

// ── HTLC Schemas ───────────────────────────────────────────────────────────────

export const HTLCTimelineEventSchema = z.object({
  label: z.string(),
  timestamp: z.string().nullable(),
  completed: z.boolean(),
});

export const ApiHTLCBaseRecordSchema = z.object({
  id: z.string(),
  onchain_id: z.string().nullable(),
  sender: z.string(),
  receiver: z.string(),
  amount: z.number(),
  hash_lock: z.string(),
  time_lock: z.number(),
  status: z.string(),
  secret: z.string().nullable(),
  hash_algorithm: z.string(),
  created_at: z.string().nullable(),
});

export const ApiHTLCRecordSchema = ApiHTLCBaseRecordSchema.extend({
  seconds_remaining: z.number(),
  can_claim: z.boolean(),
  can_refund: z.boolean(),
  phase: z.string(),
  timeline: z.array(HTLCTimelineEventSchema),
});

export const ApiHTLCListSchema = z.array(ApiHTLCRecordSchema);

// ── Swap Schemas ───────────────────────────────────────────────────────────────

export const ApiSwapRecordSchema = z.object({
  id: z.string(),
  onchain_id: z.string().nullable(),
  stellar_htlc_id: z.string().nullable(),
  other_chain: z.string(),
  other_chain_tx: z.string().nullable(),
  stellar_party: z.string(),
  other_party: z.string(),
  state: z.string(),
  created_at: z.string().nullable(),
});

export const ApiSwapListSchema = z.array(ApiSwapRecordSchema);

export const VerifySwapProofResponseSchema = z.object({
  status: z.string(),
  swap_id: z.string(),
  state: z.string(),
  verification: z.record(z.string(), z.unknown()),
});

// ── Admin Schemas ──────────────────────────────────────────────────────────────

export const AdminStatsSchema = z.object({
  htlcs: z.object({
    total: z.number(),
    active: z.number(),
    claimed: z.number(),
    refunded: z.number(),
  }),
  orders: z.object({
    total: z.number(),
    open: z.number(),
    matched: z.number(),
    cancelled: z.number(),
  }),
  swaps: z.object({
    total: z.number(),
    executed: z.number(),
  }),
  disputes: z.object({
    total: z.number(),
    open: z.number(),
    resolved: z.number(),
  }),
  volume: z.object({
    total: z.number(),
    last_24h: z.number(),
  }),
  users: z.object({
    unique_creators: z.number(),
    active_api_keys: z.number(),
  }),
});

export const VolumeBucketSchema = z.object({
  timestamp: z.string(),
  volume: z.number(),
  order_count: z.number(),
});

export const VolumeDataSchema = z.object({
  period: z.string(),
  buckets: z.array(VolumeBucketSchema),
});

export const ActiveHTLCSchema = z.object({
  id: z.string(),
  onchain_id: z.string().nullable(),
  sender: z.string(),
  receiver: z.string(),
  amount: z.number(),
  hash_lock: z.string(),
  time_lock: z.number(),
  seconds_remaining: z.number(),
  urgency: z.enum(["normal", "warning", "critical"]),
  hash_algorithm: z.string(),
  created_at: z.string().nullable(),
});

export const ActiveHTLCsResponseSchema = z.object({
  active_count: z.number(),
  htlcs: z.array(ActiveHTLCSchema),
});

export const ChainHealthSchema = z.object({
  chain: z.string(),
  health: z.enum(["healthy", "degraded", "unhealthy", "unknown"]),
  is_running: z.boolean(),
  last_synced_block: z.number().nullable(),
  latest_block: z.number().nullable(),
  blocks_behind: z.number().nullable(),
  last_updated: z.string().nullable(),
});

export const ChainHealthResponseSchema = z.object({
  chains: z.array(ChainHealthSchema),
});

export const TopTraderSchema = z.object({
  creator: z.string(),
  order_count: z.number(),
  total_volume: z.number(),
});

export const ChainPairActivitySchema = z.object({
  from_chain: z.string(),
  to_chain: z.string(),
  count: z.number(),
  volume: z.number(),
});

export const DailyActivitySchema = z.object({
  day: z.string(),
  new_orders: z.number(),
  unique_users: z.number(),
});

export const UserMetricsSchema = z.object({
  top_traders: z.array(TopTraderSchema),
  chain_pairs: z.array(ChainPairActivitySchema),
  daily_activity: z.array(DailyActivitySchema),
});

export const AlertSchema = z.object({
  id: z.string(),
  name: z.string(),
  metric: z.string(),
  condition: z.enum(["gt", "lt", "eq"]),
  threshold: z.number(),
  severity: z.enum(["info", "warning", "critical"]),
  enabled: z.boolean(),
  created_at: z.string(),
});

export const AlertListSchema = z.array(AlertSchema);

export const DisputeActionLogSchema = z.object({
  timestamp: z.string(),
  action: z.string(),
  actor: z.string(),
  details: z.record(z.string(), z.unknown()),
});

export const DisputeEvidenceSchema = z.object({
  type: z.string(),
  value: z.string(),
  description: z.string().optional(),
});

export const DisputeSchema = z.object({
  id: z.string(),
  swap_id: z.string(),
  submitted_by: z.string(),
  category: z.string(),
  reason: z.string(),
  status: z.enum(["submitted", "in_review", "resolved", "rejected", "refunded"]),
  priority: z.enum(["low", "normal", "high", "critical"]),
  evidence: z.array(DisputeEvidenceSchema),
  admin_notes: z.string().optional(),
  resolution: z.string().optional(),
  resolution_action: z
    .enum(["approve", "reject", "refund_override", "manual_settlement"])
    .optional(),
  refund_override: z.boolean(),
  refund_amount: z.number().optional(),
  reviewed_by: z.string().optional(),
  reviewed_at: z.string().optional(),
  resolved_by: z.string().optional(),
  resolved_at: z.string().optional(),
  action_log: z.array(DisputeActionLogSchema),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export const DisputeListSchema = z.array(DisputeSchema);

export const DisputeStatsSchema = z.object({
  total: z.number(),
  submitted: z.number(),
  in_review: z.number(),
  resolved: z.number(),
  rejected: z.number(),
  refunded: z.number(),
});

// ── Quote Schemas ──────────────────────────────────────────────────────────────

export const RateQuoteSchema = z.object({
  from_asset: z.string(),
  to_asset: z.string(),
  from_amount: z.number(),
  to_amount: z.number(),
  exchange_rate: z.number(),
  fee_total_usd: z.number().nullable(),
  slippage_estimate: z.number(),
  effective_rate: z.number(),
  timestamp: z.string(),
});

export const FeeComponentSchema = z.object({
  name: z.string(),
  amount: z.number(),
  asset: z.string(),
  description: z.string(),
});

export const ChainFeeEstimateSchema = z.object({
  chain: z.string(),
  total_fee: z.number(),
  asset: z.string(),
  components: z.array(FeeComponentSchema),
  estimated_at: z.string(),
});

export const SwapFeeBreakdownSchema = z.object({
  source_chain_fee: ChainFeeEstimateSchema,
  dest_chain_fee: ChainFeeEstimateSchema,
  relayer_fee: FeeComponentSchema,
  total_usd_estimate: z.number().nullable(),
});

export const TimelockWarningSchema = z.object({
  level: z.enum(["info", "warning", "error"]),
  message: z.string(),
  recommendation: z.string().nullable(),
});

export const TimelockValidationSchema = z.object({
  valid: z.boolean(),
  warnings: z.array(TimelockWarningSchema),
  recommended_duration: z.number().nullable(),
  adjusted_timelock: z.number().nullable(),
});
