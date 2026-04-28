/**
 * Generated TypeScript types from backend Pydantic schemas
 * @generated
 * @generated-at 2026-04-27T19:44:00.000Z
 */

// Common types
export type ChainId = string;
export type Address = string;
export type TransactionHash = string;
export type HTLCHash = string;
export type AssetSymbol = string;

// Utility types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * HTLCCreate API schema
 */
export interface HTLCCreate {
  sender: string;
  receiver: string;
  amount: number; // min: 1
  hash_lock: string;
  time_lock: number; // min: 1
  hash_algorithm: string;
}

/**
 * HTLCClaim API schema
 */
export interface HTLCClaim {
  secret: string;
}

/**
 * HTLCResponse API schema
 */
export interface HTLCResponse {
  id: string;
  onchain_id?: string;
  sender: string;
  receiver: string;
  amount: number;
  hash_lock: string;
  time_lock: number;
  status: string;
  secret?: string;
  hash_algorithm: string;
  created_at?: string;
}

/**
 * HTLCTimelineEvent API schema
 */
export interface HTLCTimelineEvent {
  label: string;
  timestamp?: string;
  completed: boolean;
}

/**
 * HTLCStatusResponse API schema
 */
export interface HTLCStatusResponse extends HTLCResponse {
  seconds_remaining: number;
  can_claim: boolean;
  can_refund: boolean;
  phase: string;
  timeline: HTLCTimelineEvent[];
}

/**
 * HTLCBatchCreate API schema
 */
export interface HTLCBatchCreate {
  items: HTLCCreate[]; // minLength: 1, maxLength: 50
}

/**
 * HTLCBatchItemResult API schema
 */
export interface HTLCBatchItemResult {
  index: number;
  success: boolean;
  data?: HTLCResponse;
  error?: string;
}

/**
 * HTLCBatchResponse API schema
 */
export interface HTLCBatchResponse {
  batch_id: string;
  total: number;
  succeeded: number;
  failed: number;
  items: HTLCBatchItemResult[];
}

/**
 * OrderCreate API schema
 */
export interface OrderCreate {
  creator: string;
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  from_amount: number; // min: 1
  to_amount: number; // min: 1
  min_fill_amount?: number;
  expiry: number; // min: 1
}

/**
 * OrderMatch API schema
 */
export interface OrderMatch {
  counterparty: string;
  fill_amount?: number;
}

/**
 * OrderResponse API schema
 */
export interface OrderResponse {
  id: string;
  onchain_id?: number;
  creator: string;
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  min_fill_amount?: number;
  filled_amount: number;
  expiry: number;
  status: string;
  counterparty?: string;
  created_at?: string;
}

/**
 * SwapResponse API schema
 */
export interface SwapResponse {
  id: string;
  htlc_id: string;
  order_id: string;
  status: string;
  created_at?: string;
  completed_at?: string;
}

/**
 * SwapProof API schema
 */
export interface SwapProof {
  transaction_hash: string;
  secret?: string;
  proof_data: any;
}

/**
 * APIKeyCreate API schema
 */
export interface APIKeyCreate {
  name: string;
  permissions: string[];
  expires_at?: string;
}

/**
 * APIKeyResponse API schema
 */
export interface APIKeyResponse {
  id: string;
  name: string;
  api_key: string;
  permissions: string[];
  created_at: string;
  expires_at?: string;
}

/**
 * TokenResponse API schema
 */
export interface TokenResponse {
  token: string;
  expires_at: string;
  token_type: string;
}

/**
 * TimelockValidateRequest API schema
 */
export interface TimelockValidateRequest {
  time_lock: number;
  chain: string;
}

/**
 * TimelockValidationResponse API schema
 */
export interface TimelockValidationResponse {
  valid: boolean;
  current_time: number;
  lock_time: number;
  seconds_remaining: number;
  is_expired: boolean;
}

/**
 * FeeEstimateRequest API schema
 */
export interface FeeEstimateRequest {
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  amount: number;
  urgency?: "low" | "medium" | "high";
}

/**
 * SwapFeeBreakdownResponse API schema
 */
export interface SwapFeeBreakdownResponse {
  total_fee: number;
  from_chain_fee: number;
  to_chain_fee: number;
  relayer_fee: number;
  protocol_fee: number;
  fee_currency: string;
  estimated_time: number;
  confidence_score: number;
}

/**
 * PriceRequest API schema
 */
export interface PriceRequest {
  base_asset: string;
  quote_asset: string;
  amount?: number;
}

/**
 * PriceResponse API schema
 */
export interface PriceResponse {
  base_asset: string;
  quote_asset: string;
  price: number;
  liquidity: number;
  timestamp: string;
}

/**
 * ExchangeRateRequest API schema
 */
export interface ExchangeRateRequest {
  from_chain: string;
  to_chain: string;
  from_asset: string;
  to_asset: string;
  amount: number;
}

/**
 * RateCalculateRequest API schema
 */
export interface RateCalculateRequest {
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  slippage_tolerance?: number;
}

/**
 * RateQuoteResponse API schema
 */
export interface RateQuoteResponse {
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  price_impact: number;
  slippage: number;
  fee_estimate: SwapFeeBreakdownResponse;
  valid_until: string;
}

/**
 * CEXComparisonRequest API schema
 */
export interface CEXComparisonRequest {
  base_asset: string;
  quote_asset: string;
  exchanges?: string[];
}

/**
 * RateAlertRequest API schema
 */
export interface RateAlertRequest {
  pair: string;
  threshold_rate: number;
  direction: "above" | "below";
  notification_method: "email" | "webhook";
}

/**
 * AssetCreate API schema
 */
export interface AssetCreate {
  symbol: string;
  name: string;
  chain: string;
  contract_address?: string;
  decimals: number;
}

/**
 * AssetResponse API schema
 */
export interface AssetResponse {
  symbol: string;
  name: string;
  chain: string;
  contract_address?: string;
  decimals: number;
  total_supply?: number;
  price?: number;
  liquidity?: number;
  created_at?: string;
}

/**
 * ChainInfo API schema
 */
export interface ChainInfo {
  chain_id: string;
  name: string;
  native_currency: string;
  block_time: number;
  confirmation_blocks: number;
  supported_assets: string[];
  explorer_url: string;
  rpc_url: string;
  is_testnet: boolean;
}

/**
 * DisputeCreate API schema
 */
export interface DisputeCreate {
  htlc_id: string;
  reason: string;
  evidence?: any;
}

/**
 * DisputeResponse API schema
 */
export interface DisputeResponse {
  id: string;
  htlc_id: string;
  initiator: string;
  reason: string;
  status: string;
  evidence?: any;
  resolution?: string;
  created_at?: string;
  resolved_at?: string;
}

// API Client types
export interface ChainBridgeApiClient {
  // HTLC operations
  createHTLC(data: HTLCCreate): Promise<ApiResponse<HTLCResponse>>;
  claimHTLC(id: string, data: HTLCClaim): Promise<ApiResponse<HTLCResponse>>;
  getHTLC(id: string): Promise<ApiResponse<HTLCStatusResponse>>;
  listHTLCS(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<HTLCResponse>>>;

  // Order operations
  createOrder(data: OrderCreate): Promise<ApiResponse<OrderResponse>>;
  matchOrder(id: string, data: OrderMatch): Promise<ApiResponse<OrderResponse>>;
  getOrder(id: string): Promise<ApiResponse<OrderResponse>>;
  listOrders(params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<PaginatedResponse<OrderResponse>>>;

  // Fee operations
  estimateFees(data: FeeEstimateRequest): Promise<ApiResponse<SwapFeeBreakdownResponse>>;
  getExchangeRates(data: ExchangeRateRequest): Promise<ApiResponse<RateQuoteResponse>>;

  // Auth operations
  createApiKey(data: APIKeyCreate): Promise<ApiResponse<APIKeyResponse>>;
  refreshToken(token: string): Promise<ApiResponse<TokenResponse>>;
}
