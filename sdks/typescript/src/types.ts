export type Chain = "stellar" | "bitcoin" | "ethereum" | "solana";

export type OrderStatus = "open" | "matched" | "cancelled" | "expired" | "completed";
export type SwapStatus =
  | "initiated"
  | "locked"
  | "claimed"
  | "completed"
  | "refunded"
  | "failed";
export type HtlcStatus = "active" | "claimed" | "refunded" | "expired";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T | null;
  error: ApiErrorBody | null;
}

export interface ApiErrorBody {
  code: string;
  message: string;
}

export interface CreateOrderInput {
  from_chain: Chain;
  to_chain: Chain;
  from_asset: string;
  to_asset: string;
  from_amount: string;
  to_amount: string;
  sender_address: string;
  expiry: number;
}

export interface Order {
  order_id: string;
  from_chain: Chain;
  to_chain: Chain;
  from_asset: string;
  to_asset: string;
  from_amount: string;
  to_amount: string;
  creator: string;
  status: OrderStatus;
  hash_lock?: string;
  expiry: string;
  created_at: string;
}

export interface OrderListPage {
  orders: Order[];
  pagination: { page: number; limit: number; total: number; pages: number };
}

export interface CreateHtlcInput {
  sender_address: string;
  receiver_address: string;
  amount: string;
  hash_lock: string;
  time_lock: number;
}

export interface Htlc {
  htlc_id: string;
  sender: string;
  receiver: string;
  amount: string;
  hash_lock: string;
  time_lock: string;
  status: HtlcStatus;
  created_at: string;
  tx_hash?: string;
}

export interface ClaimHtlcInput {
  secret: string;
  claimer_address: string;
}

export interface RefundHtlcInput {
  refunder_address: string;
}

export interface ExecuteSwapInput {
  order_id: string;
  counterparty_address: string;
  destination_htlc_tx: string;
  proof: ProofInput;
}

export interface ProofInput {
  chain: Chain;
  tx_hash: string;
  block_height: number;
  proof_data: string;
}

export interface Swap {
  swap_id: string;
  order_id: string;
  from_chain: Chain;
  to_chain: Chain;
  from_htlc_id: string;
  to_htlc_tx: string;
  status: SwapStatus;
  created_at: string;
  completed_at?: string;
}

export interface VerifyProofInput {
  chain: Chain;
  tx_hash: string;
  block_height: number;
  proof_data: string;
  expected_htlc_params: {
    sender: string;
    receiver: string;
    amount: string;
    hash_lock: string;
  };
}

export interface VerifyProofResult {
  valid: boolean;
  htlc_params_match: boolean;
  block_confirmations: number;
  verified_at: string;
}

export interface FeeEstimate {
  chain: Chain;
  base_fee: number;
  fee_unit: string;
  estimated_seconds: number;
}

export interface FeeBreakdown {
  network_fees: Record<Chain, number>;
  protocol_fee_bps: number;
  total_fee_usd: string;
}

export interface Asset {
  id: string;
  chain: Chain;
  symbol: string;
  name: string;
  decimals: number;
  is_verified: boolean;
  is_active: boolean;
}

export interface VolumeStats {
  total_volume: string;
  volume_by_chain: Record<string, string>;
  volume_by_asset: Record<string, string>;
  swap_count: number;
  period: string;
}

export interface SuccessRateStats {
  success_rate: number;
  total_swaps: number;
  successful_swaps: number;
  failed_swaps: number;
  expired_swaps: number;
  period: string;
}

export interface ApiKey {
  id: string;
  key?: string;
  name: string;
  owner: string;
  is_active: boolean;
  created_at: string;
}

export type WsEventType =
  | "order_created"
  | "order_matched"
  | "swap_status_changed"
  | "htlc_event";

export interface WsEvent<T = unknown> {
  type: WsEventType;
  data: T;
}
