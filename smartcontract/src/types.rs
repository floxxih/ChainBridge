use soroban_sdk::{contracttype, Address, Bytes, BytesN, String};

/// Supported hash algorithms for HTLC hash locks.
/// SHA256 is the default and compatible with Bitcoin swaps.
/// Keccak256 is used for Ethereum-compatible swaps.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HashAlgorithm {
    SHA256,
    Keccak256,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum HTLCStatus {
    Active,
    Claimed,
    Refunded,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct MultiSigConfig {
    pub signers: soroban_sdk::Vec<Address>,
    pub threshold: u32,
    pub signatures: soroban_sdk::Vec<Address>,
}

/// Soroban-compatible optional wrapper for MultiSigConfig.
///
/// Rust's `Option<MultiSigConfig>` cannot be used directly as a `#[contracttype]`
/// field because the Soroban XDR serialization layer does not generate a
/// `TryFrom<ScVal>` impl for `Option<CustomContractType>`. Using a first-class
/// enum avoids that limitation while preserving the same semantics.
#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum OptMultiSig {
    None,
    Config(MultiSigConfig),
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[allow(clippy::upper_case_acronyms)]
pub enum Chain {
    Bitcoin,
    Ethereum,
    Solana,
    Polygon,
    BSC,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SwapStatus {
    Open,
    Matched,
    Completed,
    Cancelled,
    Expired,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum AdvancedOrderType {
    Market,
    Limit,
    TWAP,
    StopLoss,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct OrderExecutionCondition {
    pub trigger_price_numerator: i128,
    pub trigger_price_denominator: i128,
    pub execute_after: u64,
    pub allow_partial_fills: bool,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
#[allow(clippy::upper_case_acronyms)]
pub struct HTLC {
    pub sender: Address,
    pub receiver: Address,
    pub amount: i128,
    pub hash_lock: BytesN<32>,
    pub time_lock: u64,
    pub status: HTLCStatus,
    pub secret: Option<Bytes>,
    pub created_at: u64,
    pub multi_sig: OptMultiSig,
    /// Hash algorithm used for this HTLC's hash lock.
    pub hash_algorithm: HashAlgorithm,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct SwapOrder {
    pub id: u64,
    pub creator: Address,
    pub from_chain: Chain,
    pub to_chain: Chain,
    pub from_asset: String,
    pub to_asset: String,
    pub from_amount: i128,
    pub to_amount: i128,
    pub expiry: u64,
    pub status: SwapStatus,
    pub counterparty: Option<Address>,
    /// Minimum amount that must be filled in a single match.
    pub min_fill_amount: i128,
    /// Amount filled so far (supports partial fills).
    pub filled_amount: i128,
    /// Ledger sequence when this order was created, for time-priority sorting.
    pub created_ledger: u32,
    /// Order execution mode for advanced order support.
    pub order_type: AdvancedOrderType,
    /// Optional trigger/conditional execution settings.
    pub execution: Option<OrderExecutionCondition>,
    /// Number of amendments applied to the order.
    pub amendment_count: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum SwapState {
    Initiated,
    Funded,
    Executed,
    Refunded,
    Failed,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CrossChainSwap {
    pub id: u64,
    pub stellar_htlc_id: u64,
    pub other_chain: Chain,
    pub other_chain_tx: String,
    pub stellar_party: Address,
    pub other_party: String,
    pub state: SwapState,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ChainProof {
    pub chain: Chain,
    pub tx_hash: String,
    pub block_height: u64,
    pub proof_data: Bytes,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StorageMetrics {
    pub total_htlcs: u64,
    pub active_htlcs: u64,
    pub expired_htlcs: u64,
    pub total_orders: u64,
    pub open_orders: u64,
    pub total_swaps: u64,
    pub storage_used_bytes: u64,
}

#[contracttype]
pub struct HTLCCleanupQueue {
    pub htlc_ids: soroban_sdk::Vec<u64>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceConfig {
    pub token_symbol: String,
    pub quorum_bps: u32,
    pub proposal_threshold: i128,
    pub voting_period_secs: u64,
    pub timelock_secs: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum ProposalStatus {
    Active,
    Succeeded,
    Defeated,
    Executed,
    Cancelled,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum VoteChoice {
    For,
    Against,
    Abstain,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct GovernanceProposal {
    pub id: u64,
    pub proposer: Address,
    pub title: String,
    pub description: String,
    pub actions: soroban_sdk::Vec<String>,
    pub created_at: u64,
    pub voting_ends_at: u64,
    pub executable_after: u64,
    pub for_votes: i128,
    pub against_votes: i128,
    pub abstain_votes: i128,
    pub status: ProposalStatus,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DelegationRecord {
    pub delegator: Address,
    pub delegatee: Address,
    pub updated_at: u64,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidityPool {
    pub id: u64,
    pub asset_a: String,
    pub asset_b: String,
    pub reserve_a: i128,
    pub reserve_b: i128,
    pub total_lp_tokens: i128,
    pub fee_bps: u32,
    pub reward_bps: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LiquidityPosition {
    pub provider: Address,
    pub pool_id: u64,
    pub lp_tokens: i128,
    pub rewards_earned: i128,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ReferralRecord {
    pub owner: Address,
    pub code: String,
    pub uses: u64,
    pub rewards_earned: i128,
    pub last_swap_id: u64,
}
