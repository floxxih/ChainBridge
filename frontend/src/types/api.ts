export interface ApiErrorShape {
  message: string;
  status: number;
  code: string;
  details?: unknown;
}

export interface ApiOrderAmendmentChange {
  before: number | null;
  after: number;
}

export interface ApiOrderAmendmentEntry {
  sequence: number;
  amended_at: string;
  changes: Record<string, ApiOrderAmendmentChange>;
  note?: string;
}

export interface ApiOrderRecord {
  id: string;
  onchain_id: number | null;
  creator: string;
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  min_fill_amount: number | null;
  filled_amount: number;
  expiry: number;
  status: string;
  counterparty: string | null;
  created_at: string | null;
  amendment_count: number;
  amendment_log: ApiOrderAmendmentEntry[];
}

export interface AmendOrderPayload {
  from_amount?: number;
  to_amount?: number;
  min_fill_amount?: number;
  expiry?: number;
  note?: string;
}

export interface CreateOrderPayload {
  creator: string;
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  min_fill_amount?: number | null;
  expiry: number;
}

export interface MatchOrderPayload {
  counterparty: string;
  fill_amount?: number;
}

export interface ListOrdersParams {
  from_chain?: string;
  to_chain?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export interface ApiSwapRecord {
  id: string;
  onchain_id: string | null;
  stellar_htlc_id: string | null;
  other_chain: string;
  other_chain_tx: string | null;
  stellar_party: string;
  other_party: string;
  state: string;
  created_at: string | null;
}

export interface ListSwapsParams {
  chain?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export interface VerifySwapProofPayload {
  chain: string;
  tx_hash: string;
  block_height: number;
  proof_data: string;
}

export interface VerifySwapProofResponse {
  status: string;
  swap_id: string;
  state: string;
  verification: Record<string, unknown>;
}

export interface HTLCTimelineEvent {
  label: string;
  timestamp: string | null;
  completed: boolean;
}

export interface ApiHTLCBaseRecord {
  id: string;
  onchain_id: string | null;
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  time_lock: number;
  status: string;
  secret: string | null;
  hash_algorithm: string;
  created_at: string | null;
}

export interface ApiHTLCRecord extends ApiHTLCBaseRecord {
  seconds_remaining: number;
  can_claim: boolean;
  can_refund: boolean;
  phase: string;
  timeline: HTLCTimelineEvent[];
}

export interface CreateHTLCPayload {
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  time_lock: number;
  hash_algorithm?: string;
}

export interface ClaimHTLCPayload {
  secret: string;
}

export interface ListHTLCsParams {
  participant?: string;
  status?: string;
  hash_lock?: string;
  limit?: number;
  offset?: number;
}
