export interface Swap {
  id: string;
  initiator: string;
  responder: string;
  inputAsset: string;
  outputAsset: string;
  inputAmount: string;
  outputAmount: string;
  hashlock: string;
  timelock: number;
  status: SwapStatus;
  createdAt: string;
  updatedAt: string;
}

export enum SwapStatus {
  PENDING = "pending",
  LOCKED_INITIATOR = "locked_initiator",
  LOCKED_RESPONDER = "locked_responder",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export interface CreateSwapRequest {
  inputAsset: string;
  outputAsset: string;
  inputAmount: string;
  outputAmount: string;
  responder?: string;
}

export interface WalletInfo {
  address: string;
  chain: string;
  balance: string;
}

export enum TransactionStatus {
  PENDING = "pending",
  CONFIRMING = "confirming",
  COMPLETED = "completed",
  FAILED = "failed",
}

export type TransactionStepKey = "approval" | "sign" | "broadcast" | "confirm";

export type TransactionStepStatus = "idle" | "active" | "completed" | "error";

export interface TransactionStep {
  key: TransactionStepKey;
  label: string;
  status: TransactionStepStatus;
  description: string;
  chain?: string;
  errorMessage?: string;
}

export interface TransactionLifecycle {
  currentStep: TransactionStepKey;
  steps: TransactionStep[];
  retryable?: boolean;
  errorMessage?: string;
}

export interface Transaction {
  id: string;
  hash: string;
  chain: string;
  type: "inbound" | "outbound" | "swap_lock" | "swap_redeem";
  amount: string;
  token: string;
  status: TransactionStatus;
  confirmations: number;
  requiredConfirmations: number;
  timestamp: string;
  counterparty?: string;
  proofVerified?: boolean;
  explorerUrl?: string;
  lifecycle?: TransactionLifecycle;
  failureReason?: string;
}

export interface TransactionStore {
  transactions: Transaction[];
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}

export enum OrderSide {
  BUY = "buy",
  SELL = "sell",
}

export enum OrderStatus {
  OPEN = "open",
  FILLED = "filled",
  CANCELLED = "cancelled",
  EXPIRED = "expired",
}

export interface Order {
  id: string;
  maker: string;
  pair: string; // e.g., "XLM/ETH"
  side: OrderSide;
  amount: string;
  price: string;
  total: string;
  tokenIn: string;
  tokenOut: string;
  chainIn: string;
  chainOut: string;
  status: OrderStatus;
  timestamp: string;
  orderType?: AdvancedOrderType;
  triggerPrice?: string;
  expiresAt?: string;
  allowPartialFills?: boolean;
  amendmentCount?: number;
  minFillAmount?: string;
  makerFeeEstimate?: string;
  takerFeeEstimate?: string;
}

export interface OrderBookStore {
  orders: Order[];
  addOrder: (order: Order) => void;
  updateOrder: (id: string, updates: Partial<Order>) => void;
  removeOrder: (id: string) => void;
}

export enum AdvancedOrderType {
  MARKET = "market",
  LIMIT = "limit",
  TWAP = "twap",
  STOP_LOSS = "stop_loss",
}

export interface GovernanceProposal {
  id: string;
  title: string;
  proposer: string;
  status: "active" | "succeeded" | "executed" | "defeated";
  participation: string;
  executableAt: string;
}

export interface LiquidityPool {
  id: string;
  pair: string;
  tvl: string;
  apr: string;
  feeTier: string;
  utilization: string;
}

export interface ReferralCampaign {
  code: string;
  referrals: number;
  rewards: string;
  conversionRate: string;
}

// Timelock validation types (#56)
export interface TimelockWarning {
  level: "info" | "warning" | "error";
  message: string;
  recommendation: string | null;
}

export interface TimelockValidation {
  valid: boolean;
  warnings: TimelockWarning[];
  recommended_duration: number | null;
  adjusted_timelock: number | null;
}

// Fee estimation types (#58)
export interface FeeComponent {
  name: string;
  amount: number;
  asset: string;
  description: string;
}

export interface ChainFeeEstimate {
  chain: string;
  total_fee: number;
  asset: string;
  components: FeeComponent[];
  estimated_at: string;
}

export interface SwapFeeBreakdown {
  source_chain_fee: ChainFeeEstimate;
  dest_chain_fee: ChainFeeEstimate;
  relayer_fee: FeeComponent;
  total_usd_estimate: number | null;
}

export interface FeeComparison {
  chain: string;
  fee: number;
  asset: string;
  speed: string;
  recommended: boolean;
}

// Price oracle types (#68)
export interface PriceData {
  asset: string;
  price_usd: number;
  source: string;
  timestamp: string;
  confidence: "high" | "medium" | "low";
}

export interface ExchangeRate {
  from_asset: string;
  to_asset: string;
  rate: number;
  inverse_rate: number;
  from_price_usd: number;
  to_price_usd: number;
  timestamp: string;
}

// Rate calculator types (#70)
export interface RateQuote {
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  exchange_rate: number;
  fee_total_usd: number | null;
  slippage_estimate: number;
  effective_rate: number;
  timestamp: string;
}

export interface CEXComparison {
  exchange: string;
  rate: number;
  fee_percent: number;
  total_receive: number;
  savings_vs_cex: number;
}
