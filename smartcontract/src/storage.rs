use crate::types::{
    Chain, CrossChainSwap, DelegationRecord, GovernanceConfig, GovernanceProposal, HTLCStatus,
    LiquidityPool, LiquidityPosition, ProposalLifecycleEvent, ReferralRecord, ReferralRewardEntry,
    StorageMetrics, SwapOrder, SwapStatus, HTLC,
};
use soroban_sdk::{contracttype, Address, Env, String, Vec};

// =============================================================================
// TTL (Time-To-Live) Policy
//
// Soroban persistent and instance entries have a finite TTL measured in ledgers.
// When the remaining TTL falls below the threshold, the entry must be bumped to
// avoid data loss.  We adopt the following TTL tiers:
//
//   Active entries  (HTLCs, Orders,  etc.)  — bump to max (~2 years)
//   Archived entries (Claimed/Refunded)      — bump to medium (~1 year)
//   Instance entries (singletons, counters)  — bump to max (~2 years)
//
// All values are documented alongside the corresponding storage functions.
// =============================================================================

/// Threshold (ledgers) for actively used persistent entries.
/// If remaining TTL dips below this, it gets bumped to `TTL_EXTEND_ACTIVE`.
/// ~230 days at 5 seconds per ledger.
pub const TTL_THRESHOLD_ACTIVE: u32 = 500_000;

/// Extended TTL for active entries: the Soroban maximum.
pub const TTL_EXTEND_ACTIVE: u32 = 6_312_000;

/// Threshold for archived (claimed / refunded) entries.
pub const TTL_THRESHOLD_ARCHIVE: u32 = 200_000;

/// Extended TTL for archived entries — long enough for audit / recovery but
/// shorter than active entries to allow natural garbage collection.
pub const TTL_EXTEND_ARCHIVE: u32 = 1_000_000;

/// Threshold for instance storage (singletons, counters).
pub const TTL_THRESHOLD_INSTANCE: u32 = 500_000;

/// Extended TTL for instance storage.
pub const TTL_EXTEND_INSTANCE: u32 = 6_312_000;

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
    /// Read pointer: the next queue index to process in cleanup_expired_htlcs.
    ExpiredHTLCHead,
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
    DelegateeDelegators(Address),
    VotingStake(Address),
    ProposalLifecycleCount(u64),
    ProposalLifecycle(u64, u64),
    ReferralRewardCounter,
    ReferralReward(u64),
    PoolCounter,
    Pool(u64),
    PoolRoute(String, String),
    Position(u64, Address),
    ReferralCode(String),
    /// Index of open order IDs for a specific chain pair (encoded as u64).
    ChainPairOrders(u64),
}

const CLEANUP_BATCH_SIZE: u64 = 10;

/// Maximum fee rate in basis points (10% = 1000 bps).
pub const MAX_FEE_RATE: u32 = 1000;

/// Bump TTL for instance storage entries.
///
/// Instance entries (admin, config, counters) are long-lived; we keep them at
/// the Soroban maximum so they survive indefinitely under normal operation.
pub fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(TTL_THRESHOLD_INSTANCE, TTL_EXTEND_INSTANCE);
}

pub fn has_admin(env: &Env) -> bool {
    bump_instance(env);
    env.storage().instance().has(&DataKey::Admin)
}

pub fn read_admin(env: &Env) -> Address {
    bump_instance(env);
    env.storage().instance().get(&DataKey::Admin).unwrap()
}

pub fn write_admin(env: &Env, admin: &Address) {
    bump_instance(env);
    env.storage().instance().set(&DataKey::Admin, admin);
}

pub fn is_paused(env: &Env) -> bool {
    bump_instance(env);
    env.storage()
        .instance()
        .get(&DataKey::Paused)
        .unwrap_or(false)
}

pub fn set_paused(env: &Env, paused: bool) {
    bump_instance(env);
    env.storage().instance().set(&DataKey::Paused, &paused);
}

pub fn get_fee_rate(env: &Env) -> u32 {
    bump_instance(env);
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

#[allow(dead_code)]
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

pub fn read_voting_stake(env: &Env, holder: &Address) -> i128 {
    env.storage()
        .persistent()
        .get(&DataKey::VotingStake(holder.clone()))
        .unwrap_or(0)
}

pub fn write_voting_stake(env: &Env, holder: &Address, balance: i128) {
    env.storage()
        .persistent()
        .set(&DataKey::VotingStake(holder.clone()), &balance);
}

pub fn read_delegatee_delegators(env: &Env, delegatee: &Address) -> Vec<Address> {
    env.storage()
        .persistent()
        .get(&DataKey::DelegateeDelegators(delegatee.clone()))
        .unwrap_or_else(|| Vec::new(env))
}

pub fn write_delegatee_delegators(env: &Env, delegatee: &Address, delegators: &Vec<Address>) {
    env.storage().persistent().set(
        &DataKey::DelegateeDelegators(delegatee.clone()),
        delegators,
    );
}

pub fn append_delegatee_delegator(env: &Env, delegatee: &Address, delegator: &Address) {
    let mut delegators = read_delegatee_delegators(env, delegatee);
    let mut found = false;
    for existing in delegators.iter() {
        if existing == *delegator {
            found = true;
            break;
        }
    }
    if !found {
        delegators.push_back(delegator.clone());
        write_delegatee_delegators(env, delegatee, &delegators);
    }
}

pub fn remove_delegatee_delegator(env: &Env, delegatee: &Address, delegator: &Address) {
    let delegators = read_delegatee_delegators(env, delegatee);
    let mut next = Vec::new(env);
    for existing in delegators.iter() {
        if existing != *delegator {
            next.push_back(existing);
        }
    }
    write_delegatee_delegators(env, delegatee, &next);
}

pub fn append_proposal_lifecycle_event(
    env: &Env,
    proposal_id: u64,
    event: &ProposalLifecycleEvent,
) -> u64 {
    let sequence = env
        .storage()
        .persistent()
        .get(&DataKey::ProposalLifecycleCount(proposal_id))
        .unwrap_or(0)
        + 1;
    env.storage()
        .persistent()
        .set(&DataKey::ProposalLifecycleCount(proposal_id), &sequence);
    env.storage().persistent().set(
        &DataKey::ProposalLifecycle(proposal_id, sequence),
        event,
    );
    sequence
}

pub fn read_proposal_lifecycle_event(
    env: &Env,
    proposal_id: u64,
    sequence: u64,
) -> Option<ProposalLifecycleEvent> {
    env.storage()
        .persistent()
        .get(&DataKey::ProposalLifecycle(proposal_id, sequence))
}

pub fn get_proposal_lifecycle_count(env: &Env, proposal_id: u64) -> u64 {
    env.storage()
        .persistent()
        .get(&DataKey::ProposalLifecycleCount(proposal_id))
        .unwrap_or(0)
}

pub fn increment_referral_reward_counter(env: &Env) -> u64 {
    let counter = env
        .storage()
        .instance()
        .get(&DataKey::ReferralRewardCounter)
        .unwrap_or(0)
        + 1;
    env.storage()
        .instance()
        .set(&DataKey::ReferralRewardCounter, &counter);
    counter
}

pub fn write_referral_reward(env: &Env, entry: &ReferralRewardEntry) {
    env.storage()
        .persistent()
        .set(&DataKey::ReferralReward(entry.id), entry);
}

pub fn get_referral_reward_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ReferralRewardCounter)
        .unwrap_or(0)
}

pub fn read_referral_reward(env: &Env, reward_id: u64) -> Option<ReferralRewardEntry> {
    env.storage()
        .persistent()
        .get(&DataKey::ReferralReward(reward_id))
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
    bump_instance(env);
    env.storage()
        .instance()
        .get(&DataKey::HTLCCounter)
        .unwrap_or(0)
}

pub fn increment_htlc_counter(env: &Env) -> u64 {
    bump_instance(env);
    let counter = get_htlc_counter(env) + 1;
    env.storage()
        .instance()
        .set(&DataKey::HTLCCounter, &counter);
    counter
}

pub fn read_htlc(env: &Env, htlc_id: u64) -> Option<HTLC> {
    let key = DataKey::HTLC(htlc_id);
    let htlc: Option<HTLC> = env.storage().persistent().get(&key);
    if let Some(ref htlc) = htlc {
        match htlc.status {
            HTLCStatus::Active => {
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD_ACTIVE, TTL_EXTEND_ACTIVE);
            }
            HTLCStatus::Claimed | HTLCStatus::Refunded => {
                env.storage()
                    .persistent()
                    .extend_ttl(&key, TTL_THRESHOLD_ARCHIVE, TTL_EXTEND_ARCHIVE);
            }
            HTLCStatus::Expired => {}
        }
    }
    htlc
}

pub fn write_htlc(env: &Env, htlc_id: u64, htlc: &HTLC) {
    let key = DataKey::HTLC(htlc_id);
    env.storage().persistent().set(&key, htlc);
    match htlc.status {
        HTLCStatus::Active => {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD_ACTIVE, TTL_EXTEND_ACTIVE);
        }
        HTLCStatus::Claimed | HTLCStatus::Refunded => {
            env.storage()
                .persistent()
                .extend_ttl(&key, TTL_THRESHOLD_ARCHIVE, TTL_EXTEND_ARCHIVE);
        }
        HTLCStatus::Expired => {}
    }
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

/// Append an HTLC id to the expired-cleanup queue.
pub fn add_expired_htlc(env: &Env, htlc_id: u64) {
    let counter = get_expired_htlc_counter(env);
    env.storage()
        .instance()
        .set(&DataKey::ExpiredHTLCQueue(counter), &htlc_id);
    set_expired_htlc_counter(env, counter + 1);
}

/// Write pointer: total number of entries ever enqueued.
pub fn get_expired_htlc_counter(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ExpiredHTLCs)
        .unwrap_or(0)
}

pub fn set_expired_htlc_counter(env: &Env, count: u64) {
    env.storage().instance().set(&DataKey::ExpiredHTLCs, &count);
}

/// Read pointer: the next queue index to process in cleanup_expired_htlcs.
pub fn get_expired_htlc_head(env: &Env) -> u64 {
    env.storage()
        .instance()
        .get(&DataKey::ExpiredHTLCHead)
        .unwrap_or(0)
}

fn set_expired_htlc_head(env: &Env, head: u64) {
    env.storage()
        .instance()
        .set(&DataKey::ExpiredHTLCHead, &head);
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

/// Process expired HTLCs from the cleanup queue.
///
/// Uses a persistent read pointer so successive calls resume where the
/// previous call left off, enabling partial cleanup over multiple calls.
/// `limit` caps how many entries are removed per call; pass `0` to use the
/// default batch size (`CLEANUP_BATCH_SIZE`). Returns the number of HTLCs
/// actually removed.
pub fn cleanup_expired_htlcs(env: &Env, limit: u32) -> u64 {
    let write_counter = get_expired_htlc_counter(env);
    let head = get_expired_htlc_head(env);

    if head >= write_counter {
        return 0;
    }

    let effective_limit = if limit == 0 {
        CLEANUP_BATCH_SIZE
    } else {
        limit as u64
    };

    let pending = write_counter - head;
    let batch_size = pending.min(effective_limit);
    let mut cleaned = 0u64;

    for i in head..head + batch_size {
        if let Some(htlc_id) = get_expired_htlc(env, i) {
            remove_htlc(env, htlc_id);
            remove_expired_htlc(env, i);
            cleaned += 1;
        }
    }

    if cleaned > 0 {
        set_expired_htlc_head(env, head + cleaned);
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
