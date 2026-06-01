#![no_std]
#![allow(clippy::too_many_arguments)]

mod crypto;
mod error;
mod governance;
mod htlc;
mod liquidity;
mod optimization;
mod order;
mod referral;
mod storage;
mod swap;
mod types;

use soroban_sdk::{contract, contractimpl, Address, Bytes, BytesN, Env, String, Vec};

use crate::error::Error;
use crate::types::{
    AdvancedOrderConfig, Chain, ChainProof, CrossChainSwap, GovernanceConfig, GovernanceProposal,
    HTLCStatus, HashAlgorithm, LiquidityPool, LiquidityPosition, OptMultiSig, OptOrderExecution,
    ProposalLifecycleEvent, ReferralRecord, ReferralRewardEntry, StorageMetrics, SwapOrder,
    VoteChoice, HTLC,
};

#[contract]
pub struct ChainBridge;

#[contractimpl]
impl ChainBridge {
    /// Initialize the cross-chain bridge protocol
    pub fn init(env: Env, admin: Address) -> Result<(), Error> {
        if storage::has_admin(&env) {
            return Err(Error::AlreadyInitialized);
        }
        storage::write_admin(&env, &admin);
        Ok(())
    }

    /// Create a Hash Time-Locked Contract
    pub fn create_htlc(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        hash_lock: soroban_sdk::BytesN<32>,
        time_lock: u64,
        multi_sig: OptMultiSig,
    ) -> Result<u64, Error> {
        sender.require_auth();
        htlc::create_htlc(
            &env, &sender, &receiver, amount, hash_lock, time_lock, multi_sig,
        )
    }

    /// Claim HTLC by revealing the secret
    pub fn claim_htlc(
        env: Env,
        receiver: Address,
        htlc_id: u64,
        secret: Bytes,
    ) -> Result<(), Error> {
        receiver.require_auth();
        htlc::claim_htlc(&env, htlc_id, secret)
    }

    /// Refund HTLC after timelock expires
    pub fn refund_htlc(env: Env, sender: Address, htlc_id: u64) -> Result<(), Error> {
        sender.require_auth();
        htlc::refund_htlc(&env, htlc_id, &sender)
    }

    /// Get HTLC details
    pub fn get_htlc(env: Env, htlc_id: u64) -> Result<HTLC, Error> {
        storage::read_htlc(&env, htlc_id).ok_or(Error::HTLCNotFound)
    }

    /// Get HTLC status
    pub fn get_htlc_status(env: Env, htlc_id: u64) -> Result<HTLCStatus, Error> {
        htlc::get_htlc_status(&env, htlc_id)
    }

    /// Get revealed secret (if claimed)
    pub fn get_secret(env: Env, htlc_id: u64) -> Result<Option<Bytes>, Error> {
        htlc::get_revealed_secret(&env, htlc_id)
    }

    /// Create a swap order
    #[allow(clippy::too_many_arguments)]
    pub fn create_order(
        env: Env,
        creator: Address,
        from_chain: Chain,
        to_chain: Chain,
        from_asset: String,
        to_asset: String,
        from_amount: i128,
        to_amount: i128,
        expiry: u64,
    ) -> Result<u64, Error> {
        creator.require_auth();
        order::create_order(
            &env,
            &creator,
            from_chain,
            to_chain,
            from_asset,
            to_asset,
            from_amount,
            to_amount,
            expiry,
        )
    }

    /// Match and execute a swap order
    pub fn match_order(env: Env, counterparty: Address, order_id: u64) -> Result<u64, Error> {
        counterparty.require_auth();
        order::match_order(&env, &counterparty, order_id)
    }

    /// Get swap order details
    pub fn get_order(env: Env, order_id: u64) -> Result<SwapOrder, Error> {
        storage::read_order(&env, order_id).ok_or(Error::OrderNotFound)
    }

    /// Cancel a swap order
    pub fn cancel_order(env: Env, creator: Address, order_id: u64) -> Result<(), Error> {
        creator.require_auth();
        order::cancel_order(&env, &creator, order_id)
    }

    /// Verify cross-chain proof
    pub fn verify_proof(env: Env, proof: ChainProof) -> Result<bool, Error> {
        swap::verify_chain_proof(&env, &proof)
    }

    /// Complete cross-chain swap
    pub fn complete_swap(env: Env, swap_id: u64, proof: ChainProof) -> Result<(), Error> {
        swap::complete_cross_chain_swap(&env, swap_id, proof)
    }

    /// Get swap details
    pub fn get_swap(env: Env, swap_id: u64) -> Result<CrossChainSwap, Error> {
        storage::read_swap(&env, swap_id).ok_or(Error::HTLCNotFound)
    }

    /// Add supported chain (admin only)
    pub fn add_chain(env: Env, admin: Address, chain_id: u32) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = storage::read_admin(&env);
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::add_supported_chain(&env, chain_id);
        Ok(())
    }

    /// Pause contract
    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = storage::read_admin(&env);
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::set_paused(&env, true);
        Ok(())
    }

    /// Unpause contract
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        admin.require_auth();
        let stored_admin = storage::read_admin(&env);
        if admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::set_paused(&env, false);
        Ok(())
    }

    /// Transfer admin privileges to a new address.
    ///
    /// The current admin must authorize the transfer. After transfer,
    /// the new admin can call admin-only functions and the old admin
    /// loses all admin privileges.
    pub fn transfer_admin(
        env: Env,
        current_admin: Address,
        new_admin: Address,
    ) -> Result<(), Error> {
        current_admin.require_auth();
        let stored_admin = storage::read_admin(&env);
        if current_admin != stored_admin {
            return Err(Error::Unauthorized);
        }
        storage::write_admin(&env, &new_admin);
        Ok(())
    }

    /// Set Fee Rate
    pub fn set_fee_rate(env: Env, admin: Address, rate: u32) -> Result<(), Error> {
        admin.require_auth();
        if admin != storage::read_admin(&env) {
            return Err(Error::Unauthorized);
        }
        if rate > storage::MAX_FEE_RATE {
            return Err(Error::InvalidFeeRate);
        }
        storage::set_fee_rate(&env, rate);
        Ok(())
    }

    /// Set Fee Treasury
    pub fn set_fee_treasury(env: Env, admin: Address, treasury: Address) -> Result<(), Error> {
        admin.require_auth();
        if admin != storage::read_admin(&env) {
            return Err(Error::Unauthorized);
        }
        storage::set_fee_treasury(&env, &treasury);
        Ok(())
    }

    /// Sign HTLC for MultiSig
    pub fn sign_htlc(env: Env, htlc_id: u64, signer: Address) -> Result<(), Error> {
        signer.require_auth();
        htlc::sign_htlc(&env, htlc_id, &signer)
    }

    /// Get storage metrics
    pub fn get_storage_metrics(env: Env) -> StorageMetrics {
        storage::get_storage_metrics(&env)
    }

    /// Cleanup expired HTLCs.
    ///
    /// `limit` caps how many entries are removed per call; pass `0` to use the
    /// default batch size. Returns the number of HTLCs actually cleaned up.
    pub fn cleanup_expired_htlcs(env: Env, limit: u32) -> u64 {
        storage::cleanup_expired_htlcs(&env, limit)
    }

    /// Mark HTLC for cleanup
    pub fn mark_htlc_expired(env: Env, htlc_id: u64) -> Result<(), Error> {
        storage::add_expired_htlc(&env, htlc_id);
        Ok(())
    }

    /// Create an HTLC with an explicit hash algorithm.
    ///
    /// Use `HashAlgorithm::SHA256` for Bitcoin-compatible swaps and
    /// `HashAlgorithm::Keccak256` for Ethereum-compatible swaps.
    pub fn create_htlc_with_algo(
        env: Env,
        sender: Address,
        receiver: Address,
        amount: i128,
        hash_lock: BytesN<32>,
        time_lock: u64,
        algorithm: HashAlgorithm,
    ) -> Result<u64, Error> {
        sender.require_auth();
        htlc::create_htlc_with_algorithm(
            &env,
            &sender,
            &receiver,
            amount,
            hash_lock,
            time_lock,
            OptMultiSig::None,
            algorithm,
        )
    }

    /// Generate a cryptographically random 32-byte secret using the ledger PRNG.
    pub fn generate_htlc_secret(env: Env) -> BytesN<32> {
        crypto::generate_secret(&env)
    }

    /// Create a swap order with an explicit minimum fill amount.
    ///
    /// Setting `min_fill_amount < from_amount` enables partial fills.
    #[allow(clippy::too_many_arguments)]
    pub fn create_order_with_min_fill(
        env: Env,
        creator: Address,
        from_chain: Chain,
        to_chain: Chain,
        from_asset: String,
        to_asset: String,
        from_amount: i128,
        to_amount: i128,
        expiry: u64,
        min_fill_amount: i128,
    ) -> Result<u64, Error> {
        creator.require_auth();
        order::create_order_with_min_fill(
            &env,
            &creator,
            from_chain,
            to_chain,
            from_asset,
            to_asset,
            from_amount,
            to_amount,
            expiry,
            min_fill_amount,
            crate::types::AdvancedOrderType::Market,
            OptOrderExecution::None,
        )
    }

    pub fn create_advanced_order(
        env: Env,
        creator: Address,
        from_chain: Chain,
        to_chain: Chain,
        from_asset: String,
        to_asset: String,
        from_amount: i128,
        to_amount: i128,
        expiry: u64,
        config: AdvancedOrderConfig,
    ) -> Result<u64, Error> {
        creator.require_auth();
        order::create_advanced_order(
            &env,
            &creator,
            from_chain,
            to_chain,
            from_asset,
            to_asset,
            from_amount,
            to_amount,
            expiry,
            config.min_fill_amount,
            config.order_type,
            config.execution,
        )
    }

    /// Partially or fully match an open order.
    ///
    /// `fill_amount` must be >= `min_fill_amount` and <= unfilled remainder.
    pub fn match_order_partial(
        env: Env,
        counterparty: Address,
        order_id: u64,
        fill_amount: i128,
    ) -> Result<u64, Error> {
        counterparty.require_auth();
        order::match_order_partial(&env, &counterparty, order_id, fill_amount)
    }

    /// Mark an expired open order as Expired and remove it from the index.
    ///
    /// Anyone may call this to clean up stale open orders after their expiry.
    pub fn expire_order(env: Env, order_id: u64) -> Result<(), Error> {
        order::expire_order(&env, order_id)
    }

    /// Return all open order IDs for a given chain pair.
    pub fn get_orders_by_chain_pair(env: Env, from_chain: Chain, to_chain: Chain) -> Vec<u64> {
        storage::get_orders_by_chain_pair(&env, &from_chain, &to_chain)
    }

    pub fn amend_order(
        env: Env,
        creator: Address,
        order_id: u64,
        to_amount: i128,
        expiry: u64,
        execution: OptOrderExecution,
    ) -> Result<(), Error> {
        creator.require_auth();
        order::amend_order(&env, &creator, order_id, to_amount, expiry, execution)
    }

    pub fn init_governance(
        env: Env,
        admin: Address,
        config: GovernanceConfig,
    ) -> Result<(), Error> {
        admin.require_auth();
        if admin != storage::read_admin(&env) {
            return Err(Error::Unauthorized);
        }
        governance::init_governance(&env, config)
    }

    pub fn set_voting_stake(env: Env, holder: Address, balance: i128) -> Result<(), Error> {
        holder.require_auth();
        governance::set_voting_stake(&env, &holder, balance)
    }

    pub fn get_voting_power(env: Env, voter: Address, proposal_id: u64) -> Result<i128, Error> {
        governance::resolve_voting_power(&env, &voter, proposal_id)
    }

    pub fn create_proposal(
        env: Env,
        proposer: Address,
        title: String,
        description: String,
        actions: Vec<String>,
    ) -> Result<u64, Error> {
        proposer.require_auth();
        governance::create_proposal(&env, &proposer, title, description, actions)
    }

    pub fn cast_vote(
        env: Env,
        voter: Address,
        proposal_id: u64,
        choice: VoteChoice,
    ) -> Result<i128, Error> {
        voter.require_auth();
        governance::cast_vote(&env, &voter, proposal_id, choice)
    }

    pub fn execute_proposal(env: Env, proposal_id: u64) -> Result<(), Error> {
        governance::execute_proposal(&env, proposal_id)
    }

    pub fn get_proposal(env: Env, proposal_id: u64) -> Result<GovernanceProposal, Error> {
        storage::read_proposal(&env, proposal_id).ok_or(Error::OrderNotFound)
    }

    pub fn get_proposal_lifecycle(env: Env, proposal_id: u64) -> Vec<ProposalLifecycleEvent> {
        governance::get_proposal_lifecycle(&env, proposal_id)
    }

    pub fn delegate_votes(env: Env, delegator: Address, delegatee: Address) -> Result<(), Error> {
        delegator.require_auth();
        governance::delegate_votes(&env, &delegator, &delegatee)
    }

    pub fn create_pool(
        env: Env,
        asset_a: String,
        asset_b: String,
        fee_bps: u32,
        reward_bps: u32,
    ) -> Result<u64, Error> {
        liquidity::create_pool(&env, asset_a, asset_b, fee_bps, reward_bps)
    }

    pub fn add_liquidity(
        env: Env,
        provider: Address,
        pool_id: u64,
        amount_a: i128,
        amount_b: i128,
    ) -> Result<i128, Error> {
        provider.require_auth();
        liquidity::add_liquidity(&env, &provider, pool_id, amount_a, amount_b)
    }

    pub fn get_pool(env: Env, pool_id: u64) -> Result<LiquidityPool, Error> {
        storage::read_pool(&env, pool_id).ok_or(Error::OrderNotFound)
    }

    pub fn get_position(
        env: Env,
        pool_id: u64,
        provider: Address,
    ) -> Result<LiquidityPosition, Error> {
        storage::read_position(&env, pool_id, &provider).ok_or(Error::OrderNotFound)
    }

    pub fn get_pool_quote(
        env: Env,
        asset_in: String,
        asset_out: String,
        amount_in: i128,
    ) -> Result<i128, Error> {
        liquidity::get_pool_quote(&env, asset_in, asset_out, amount_in)
    }

    /// Remove liquidity from a pool. Returns (amount_a, amount_b) returned to provider.
    pub fn remove_liquidity(
        env: Env,
        provider: Address,
        pool_id: u64,
        lp_tokens: i128,
    ) -> Result<(i128, i128), Error> {
        provider.require_auth();
        liquidity::remove_liquidity(&env, &provider, pool_id, lp_tokens)
    }

    /// Claim accrued rewards for an LP position. Returns the claimed amount.
    pub fn claim_rewards(env: Env, provider: Address, pool_id: u64) -> Result<i128, Error> {
        provider.require_auth();
        liquidity::claim_rewards(&env, &provider, pool_id)
    }

    /// Execute a pool swap with slippage protection.
    /// Rejects if the quoted output is below `min_amount_out`.
    pub fn swap_with_slippage(
        env: Env,
        asset_in: String,
        asset_out: String,
        amount_in: i128,
        min_amount_out: i128,
    ) -> Result<i128, Error> {
        liquidity::swap_with_slippage(&env, asset_in, asset_out, amount_in, min_amount_out)
    }

    pub fn register_referral_code(env: Env, owner: Address, code: String) -> Result<(), Error> {
        owner.require_auth();
        referral::register_referral_code(&env, &owner, code)
    }

    pub fn record_referral_swap(
        env: Env,
        code: String,
        swap_id: u64,
        notional_amount: i128,
    ) -> Result<u64, Error> {
        referral::record_referral_swap(&env, code, swap_id, notional_amount)
    }

    pub fn settle_referral_reward(env: Env, reward_id: u64) -> Result<(), Error> {
        referral::settle_referral_reward(&env, reward_id)
    }

    pub fn claim_referral_rewards(env: Env, owner: Address, code: String) -> Result<i128, Error> {
        owner.require_auth();
        referral::claim_referral_rewards(&env, &owner, code)
    }

    pub fn get_referral_rewards(env: Env, code: String) -> Vec<ReferralRewardEntry> {
        referral::get_referral_rewards(&env, code)
    }

    pub fn get_referral_record(env: Env, code: String) -> Result<ReferralRecord, Error> {
        storage::read_referral_record(&env, &code).ok_or(Error::OrderNotFound)
    }
}

#[cfg(test)]
mod test;
