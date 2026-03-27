use crate::types::{
    Chain, CrossChainSwap, DelegationRecord, GovernanceConfig, GovernanceProposal, HTLCStatus,
    LiquidityPool, LiquidityPosition, ReferralRecord, StorageMetrics, SwapOrder, SwapStatus, HTLC,
};
use soroban_sdk::{contracttype, Address, Env, String, Vec};

/// Encodes a chain-pair as a single u64 for use as a storage key.
/// Combines from_chain and to_chain discriminants into the high and low 32 bits.
fn chain_pair_key(from: &Chain, to: &Chain) -> u64 {
    let from_id = chain_discriminant(from) as u64;
    let to_id = chain_discriminant(to) as u64;
    (from_id << 32) | to_id
}

fn chain_discriminant(chain: &Chain) -> u32 {
    match chain {
        Chain::Bitcoin => 0,
        Chain::Ethereum => 1,
        Chain::Solana => 2,
        Chain::Polygon => 3,
        Chain::BSC => 4,
    }
}

#[contracttype]
#[derive(Clone)]
#[allow(clippy::upper_case_acronyms)]
pub enum DataKey {
    Admin,
    HTLCCounter,
    HTLC(u64),
    OrderCounter,
    Order(u64),
    SwapCounter,
    Swap(u64),
    SupportedChain(u32),
    ExpiredHTLCs,
    ExpiredHTLCQueue(u64),
    StorageMetrics,
    Paused,
    FeeRate,
    FeeTreasury,
    GovernanceConfig,
    ProposalCounter,
    Proposal(u64),
    ProposalVote(u64, Address),
    Delegation(Address),
    PoolCounter,
    Pool(u64),
    PoolRoute(String, String),
    Position(u64, Address),
    ReferralCode(String),
    /// Index of open order IDs for a specific chain pair (encoded as u64).
    ChainPairOrders(u64),
}

const CLEANUP_BATCH_SIZE: u64 = 10;

pub fn has_admin(env: &Env) -> bool {
    env.storage().instance().has(&DataKey::Admin)
}

pub fn read_admin(env: &Env) -> Address {
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn is_paused(env: &Env) -> bool {
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn set_paused(env: &Env, paused: bool) {
    env.storage().instance().set(&DataKey::Paused, &paused);
}

pub fn get_fee_rate(env: &Env) -> u32 {
    env.storage()
        .instance()
        .get(&DataKey::FeeRate)
        .unwrap_or(30)
}

pub fn set_fee_rate(env: &Env, rate: u32) {
    env.storage().instance().set(&DataKey::FeeRate, &rate);
}

pub fn get_fee_treasury(env: &Env) -> Option<Address> {
    env.storage().instance().get(&DataKey::FeeTreasury)
}

pub fn set_fee_treasury(env: &Env, treasury: &Address) {
    env.storage()
        .instance()
        .set(&DataKey::FeeTreasury, treasury);
}

pub fn read_governance_config(env: &Env) -> Option<GovernanceConfig> {
    env.storage().instance().get(&DataKey::GovernanceConfig)
}

pub fn write_governance_config(env: &Env, config: &GovernanceConfig) {
    env.storage()
        .instance()
        .set(&DataKey::GovernanceConfig, config);
}

pub fn get_proposal_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ProposalCounter)
        .unwrap_or(0)
}

pub fn increment_proposal_counter(env: &Env) -> u64 {
    let counter = get_proposal_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::ProposalCounter, &counter);
    counter
}

pub fn read_proposal(env: &Env, proposal_id: u64) -> Option<GovernanceProposal> {
    env.storage()
        .persistent()
        .get(&DataKey::Proposal(proposal_id))
}

pub fn write_proposal(env: &Env, proposal_id: u64, proposal: &GovernanceProposal) {
    env.storage()
        .persistent()
        .set(&DataKey::Proposal(proposal_id), proposal);
}

pub fn read_proposal_vote(env: &Env, proposal_id: u64, voter: &Address) -> Option<bool> {
    env.storage()
        .persistent()
        .get(&DataKey::ProposalVote(proposal_id, voter.clone()))
}

pub fn write_proposal_vote(env: &Env, proposal_id: u64, voter: &Address, voted: bool) {
    env.storage()
        .persistent()
        .set(&DataKey::ProposalVote(proposal_id, voter.clone()), &voted);
}

pub fn read_delegation(env: &Env, delegator: &Address) -> Option<DelegationRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::Delegation(delegator.clone()))
}

pub fn write_delegation(env: &Env, record: &DelegationRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::Delegation(record.delegator.clone()), record);
}

pub fn get_pool_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::PoolCounter)
        .unwrap_or(0)
}

pub fn increment_pool_counter(env: &Env) -> u64 {
    let counter = get_pool_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::PoolCounter, &counter);
    counter
}

pub fn read_pool(env: &Env, pool_id: u64) -> Option<LiquidityPool> {
    env.storage().persistent().get(&DataKey::Pool(pool_id))
}

pub fn write_pool(env: &Env, pool_id: u64, pool: &LiquidityPool) {
    env.storage()
        .persistent()
        .set(&DataKey::Pool(pool_id), pool);
}

pub fn write_pool_route(env: &Env, asset_in: &String, asset_out: &String, pool_id: u64) {
    env.storage().persistent().set(
        &DataKey::PoolRoute(asset_in.clone(), asset_out.clone()),
        &pool_id,
    );
}

pub fn read_pool_route(env: &Env, asset_in: &String, asset_out: &String) -> Option<u64> {
    env.storage()
        .persistent()
        .get(&DataKey::PoolRoute(asset_in.clone(), asset_out.clone()))
}

pub fn read_position(env: &Env, pool_id: u64, provider: &Address) -> Option<LiquidityPosition> {
    env.storage()
        .persistent()
        .get(&DataKey::Position(pool_id, provider.clone()))
}

pub fn write_position(env: &Env, position: &LiquidityPosition) {
    env.storage().persistent().set(
        &DataKey::Position(position.pool_id, position.provider.clone()),
        position,
    );
}

pub fn read_referral_record(env: &Env, code: &String) -> Option<ReferralRecord> {
    env.storage()
        .persistent()
        .get(&DataKey::ReferralCode(code.clone()))
}

pub fn write_referral_record(env: &Env, record: &ReferralRecord) {
    env.storage()
        .persistent()
        .set(&DataKey::ReferralCode(record.code.clone()), record);
}

pub fn get_htlc_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::HTLCCounter)
        .unwrap_or(0)
}

pub fn increment_htlc_counter(env: &Env) -> u64 {
    let counter = get_htlc_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::HTLCCounter, &counter);
    counter
}

pub fn read_htlc(env: &Env, htlc_id: u64) -> Option<HTLC> {
    env.storage().persistent().get(&DataKey::HTLC(htlc_id))
}

pub fn write_htlc(env: &Env, htlc_id: u64, htlc: &HTLC) {
    env.storage()
        .persistent()
        .set(&DataKey::HTLC(htlc_id), htlc);
}

pub fn remove_htlc(env: &Env, htlc_id: u64) {
    env.storage().persistent().remove(&DataKey::HTLC(htlc_id));
}

pub fn get_order_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::OrderCounter)
        .unwrap_or(0)
}

pub fn increment_order_counter(env: &Env) -> u64 {
    let counter = get_order_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::OrderCounter, &counter);
    counter
}

pub fn read_order(env: &Env, order_id: u64) -> Option<SwapOrder> {
    env.storage().persistent().get(&DataKey::Order(order_id))
}

pub fn write_order(env: &Env, order_id: u64, order: &SwapOrder) {
    env.storage()
        .persistent()
        .set(&DataKey::Order(order_id), order);
}

pub fn remove_order(env: &Env, order_id: u64) {
    env.storage().persistent().remove(&DataKey::Order(order_id));
}

pub fn get_swap_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::SwapCounter)
        .unwrap_or(0)
}

pub fn increment_swap_counter(env: &Env) -> u64 {
    let counter = get_swap_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::SwapCounter, &counter);
    counter
}

pub fn read_swap(env: &Env, swap_id: u64) -> Option<CrossChainSwap> {
    env.storage().persistent().get(&DataKey::Swap(swap_id))
}

#[allow(dead_code)]
pub fn write_swap(env: &Env, swap_id: u64, swap: &CrossChainSwap) {
    env.storage()
        .persistent()
        .set(&DataKey::Swap(swap_id), swap);
}

#[allow(dead_code)]
pub fn remove_swap(env: &Env, swap_id: u64) {
    env.storage().persistent().remove(&DataKey::Swap(swap_id));
}

#[allow(dead_code)]
pub fn is_chain_supported(env: &Env, chain_id: u32) -> bool {
    env.storage()
        .persistent()
        .has(&DataKey::SupportedChain(chain_id))
}

pub fn add_supported_chain(env: &Env, chain_id: u32) {
    env.storage()
        .persistent()
        .set(&DataKey::SupportedChain(chain_id), &true);
}

// =============================================================================
// Chain-pair order index for O(1) lookup by route
// =============================================================================

/// Add an order ID to the index for the given chain pair.
pub fn add_order_to_chain_index(env: &Env, from: &Chain, to: &Chain, order_id: u64) {
    let key = DataKey::ChainPairOrders(chain_pair_key(from, to));
    let mut ids: Vec<u64> = env
        .storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env));
    ids.push_back(order_id);
    env.storage().persistent().set(&key, &ids);
}

/// Remove an order ID from the chain-pair index when matched, cancelled, or expired.
pub fn remove_order_from_chain_index(env: &Env, from: &Chain, to: &Chain, order_id: u64) {
    let key = DataKey::ChainPairOrders(chain_pair_key(from, to));
    let Some(ids) = env.storage().persistent().get::<DataKey, Vec<u64>>(&key) else {
        return;
    };
    let mut updated: Vec<u64> = Vec::new(env);
    for id in ids.iter() {
        if id != order_id {
            updated.push_back(id);
        }
    }
    env.storage().persistent().set(&key, &updated);
}

/// Return all open order IDs for a given chain pair.
///
/// Callers should apply price-time priority: sort by `to_amount / from_amount`
/// descending (best rate for the taker), breaking ties by `created_ledger`
/// ascending (older orders first).
pub fn get_orders_by_chain_pair(env: &Env, from: &Chain, to: &Chain) -> Vec<u64> {
    let key = DataKey::ChainPairOrders(chain_pair_key(from, to));
    env.storage()
        .persistent()
        .get(&key)
        .unwrap_or_else(|| Vec::new(env))
}

// =============================================================================
// Expired HTLC cleanup queue
// =============================================================================

pub fn add_expired_htlc(env: &Env, htlc_id: u64) {
    let counter = get_expired_htlc_counter(env);
    env.storage()
        .instance()
        .set(&DataKey::ExpiredHTLCQueue(counter), &htlc_id);
    set_expired_htlc_counter(env, counter + 1);
}

pub fn get_expired_htlc_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ExpiredHTLCs)
        .unwrap_or(0)
}

pub fn set_expired_htlc_counter(env: &Env, count: u64) {
    env.storage().instance().set(&DataKey::ExpiredHTLCs, &count);
}

pub fn get_expired_htlc(env: &Env, index: u64) -> Option<u64> {
    env.storage()
        .instance()
        .get(&DataKey::ExpiredHTLCQueue(index))
}

pub fn remove_expired_htlc(env: &Env, index: u64) {
    env.storage()
        .instance()
        .remove(&DataKey::ExpiredHTLCQueue(index));
}

pub fn cleanup_expired_htlcs(env: &Env) -> u64 {
    let counter = get_expired_htlc_counter(env);
    let mut cleaned = 0u64;

    let batch_end = if counter > CLEANUP_BATCH_SIZE {
        CLEANUP_BATCH_SIZE
    } else {
        counter
    };

    for i in 0..batch_end {
        if let Some(htlc_id) = get_expired_htlc(env, i) {
            remove_htlc(env, htlc_id);
            remove_expired_htlc(env, i);
            cleaned += 1;
        }
    }

    if cleaned > 0 {
        let remaining = counter.saturating_sub(cleaned);
        set_expired_htlc_counter(env, remaining);
    }

    cleaned
}

pub fn get_storage_metrics(env: &Env) -> StorageMetrics {
    let total_htlcs = get_htlc_counter(env);
    let total_orders = get_order_counter(env);
    let total_swaps = get_swap_counter(env);

    let mut active_htlcs = 0u64;
    let mut expired_htlcs = 0u64;

    for i in 1..=total_htlcs {
        if let Some(htlc) = read_htlc(env, i) {
            match htlc.status {
                HTLCStatus::Active => active_htlcs += 1,
                HTLCStatus::Expired => expired_htlcs += 1,
                _ => {}
            }
        }
    }

    let mut open_orders = 0u64;
    for i in 1..=total_orders {
        if let Some(order) = read_order(env, i) {
            if order.status == SwapStatus::Open {
                open_orders += 1;
            }
        }
    }

    StorageMetrics {
        total_htlcs,
        active_htlcs,
        expired_htlcs,
        total_orders,
        open_orders,
        total_swaps,
        storage_used_bytes: 0,
    }
}

#[allow(dead_code)]
pub fn write_storage_metrics(env: &Env, metrics: &StorageMetrics) {
    env.storage()
        .instance()
        .set(&DataKey::StorageMetrics, metrics);
}
