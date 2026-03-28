use crate::error::Error;
use crate::storage;
use crate::types::{LiquidityPool, LiquidityPosition};
use soroban_sdk::{Address, Env, String};

pub fn create_pool(
    env: &Env,
    asset_a: String,
    asset_b: String,
    fee_bps: u32,
    reward_bps: u32,
) -> Result<u64, Error> {
    if fee_bps > 1_000 || reward_bps > 10_000 || asset_a == asset_b {
        return Err(Error::InvalidFeeRate);
    }

    let pool_id = storage::increment_pool_counter(env);
    let pool = LiquidityPool {
        id: pool_id,
        asset_a: asset_a.clone(),
        asset_b: asset_b.clone(),
        reserve_a: 0,
        reserve_b: 0,
        total_lp_tokens: 0,
        fee_bps,
        reward_bps,
    };
    storage::write_pool(env, pool_id, &pool);
    storage::write_pool_route(env, &asset_a, &asset_b, pool_id);
    storage::write_pool_route(env, &asset_b, &asset_a, pool_id);
    Ok(pool_id)
}

pub fn add_liquidity(
    env: &Env,
    provider: &Address,
    pool_id: u64,
    amount_a: i128,
    amount_b: i128,
) -> Result<i128, Error> {
    if amount_a <= 0 || amount_b <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut pool = storage::read_pool(env, pool_id).ok_or(Error::OrderNotFound)?;
    let minted = if pool.total_lp_tokens == 0 {
        amount_a + amount_b
    } else {
        let share_a = amount_a * pool.total_lp_tokens / pool.reserve_a.max(1);
        let share_b = amount_b * pool.total_lp_tokens / pool.reserve_b.max(1);
        share_a.min(share_b)
    };

    pool.reserve_a += amount_a;
    pool.reserve_b += amount_b;
    pool.total_lp_tokens += minted;
    storage::write_pool(env, pool_id, &pool);

    let mut position =
        storage::read_position(env, pool_id, provider).unwrap_or(LiquidityPosition {
            provider: provider.clone(),
            pool_id,
            lp_tokens: 0,
            rewards_earned: 0,
        });
    position.lp_tokens += minted;
    position.rewards_earned += minted * pool.reward_bps as i128 / 10_000;
    storage::write_position(env, &position);
    Ok(minted)
}

pub fn get_pool_quote(
    env: &Env,
    asset_in: String,
    asset_out: String,
    amount_in: i128,
) -> Result<i128, Error> {
    if amount_in <= 0 {
        return Err(Error::InvalidAmount);
    }
    let pool_id =
        storage::read_pool_route(env, &asset_in, &asset_out).ok_or(Error::OrderNotFound)?;
    let pool = storage::read_pool(env, pool_id).ok_or(Error::OrderNotFound)?;

    let (reserve_in, reserve_out) = if pool.asset_a == asset_in {
        (pool.reserve_a, pool.reserve_b)
    } else {
        (pool.reserve_b, pool.reserve_a)
    };
    if reserve_in <= 0 || reserve_out <= 0 {
        return Err(Error::AmountTooSmall);
    }

    let amount_in_after_fee = amount_in * (10_000 - pool.fee_bps as i128) / 10_000;
    let numerator = amount_in_after_fee * reserve_out;
    let denominator = reserve_in + amount_in_after_fee;
    Ok(numerator / denominator)
}
