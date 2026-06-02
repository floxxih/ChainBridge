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

/// Withdraw `lp_tokens` worth of liquidity from a pool.
/// Returns `(amount_a, amount_b)` proportional to the pool share.
pub fn remove_liquidity(
    env: &Env,
    provider: &Address,
    pool_id: u64,
    lp_tokens: i128,
) -> Result<(i128, i128), Error> {
    if lp_tokens <= 0 {
        return Err(Error::InvalidAmount);
    }
    let mut pool = storage::read_pool(env, pool_id).ok_or(Error::OrderNotFound)?;
    let mut position = storage::read_position(env, pool_id, provider).ok_or(Error::Unauthorized)?;

    if position.lp_tokens < lp_tokens {
        return Err(Error::InvalidAmount);
    }

    let amount_a = lp_tokens * pool.reserve_a / pool.total_lp_tokens;
    let amount_b = lp_tokens * pool.reserve_b / pool.total_lp_tokens;

    pool.reserve_a -= amount_a;
    pool.reserve_b -= amount_b;
    pool.total_lp_tokens -= lp_tokens;
    storage::write_pool(env, pool_id, &pool);

    position.lp_tokens -= lp_tokens;
    storage::write_position(env, &position);

    Ok((amount_a, amount_b))
}

/// Claim all accrued rewards for a position. Returns the claimed amount.
pub fn claim_rewards(env: &Env, provider: &Address, pool_id: u64) -> Result<i128, Error> {
    let mut position = storage::read_position(env, pool_id, provider).ok_or(Error::Unauthorized)?;

    let rewards = position.rewards_earned;
    if rewards <= 0 {
        return Err(Error::AmountTooSmall);
    }

    position.rewards_earned = 0;
    storage::write_position(env, &position);

    Ok(rewards)
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

/// Execute a pool route swap with slippage protection.
/// `min_amount_out` is the minimum acceptable output; rejects if quote falls below it.
pub fn swap_with_slippage(
    env: &Env,
    asset_in: String,
    asset_out: String,
    amount_in: i128,
    min_amount_out: i128,
) -> Result<i128, Error> {
    let quoted = get_pool_quote(env, asset_in.clone(), asset_out.clone(), amount_in)?;
    if quoted < min_amount_out {
        return Err(Error::AmountTooSmall);
    }

    // Update reserves to reflect the swap.
    let pool_id =
        storage::read_pool_route(env, &asset_in, &asset_out).ok_or(Error::OrderNotFound)?;
    let mut pool = storage::read_pool(env, pool_id).ok_or(Error::OrderNotFound)?;

    let amount_in_after_fee = amount_in * (10_000 - pool.fee_bps as i128) / 10_000;
    if pool.asset_a == asset_in {
        pool.reserve_a += amount_in_after_fee;
        pool.reserve_b -= quoted;
    } else {
        pool.reserve_b += amount_in_after_fee;
        pool.reserve_a -= quoted;
    }
    storage::write_pool(env, pool_id, &pool);

    Ok(quoted)
}

/// Multi-hop routing: evaluate routes across several pools.
/// Returns the best output amount and the path taken.
///
/// Searches for both direct routes and multi-hop paths (up to 3 hops).
/// Compares final output amounts after fees and selects the best path.
///
/// Example: To swap A → D, might find:
/// - Direct: A → D (1 pool)
/// - 2-hop: A → B → D (2 pools)
/// - 3-hop: A → B → C → D (3 pools)
///
/// Returns `(best_output_amount, route_path)` where route_path contains
/// the sequence of assets traversed.
pub fn find_best_route(
    env: &Env,
    asset_in: String,
    asset_out: String,
    amount_in: i128,
) -> Result<(i128, crate::types::SwapRoute), Error> {
    if amount_in <= 0 {
        return Err(Error::InvalidAmount);
    }

    let mut best_output = 0i128;
    let mut best_route = crate::types::SwapRoute {
        path: soroban_sdk::vec![env],
        output_amount: 0,
        total_fee_bps: 0,
    };

    // Try direct route first
    if let Ok(direct_output) = get_pool_quote(env, asset_in.clone(), asset_out.clone(), amount_in)
    {
        if let Some(pool_id) = storage::read_pool_route(env, &asset_in, &asset_out) {
            if let Some(pool) = storage::read_pool(env, pool_id) {
                best_output = direct_output;
                let mut path = soroban_sdk::vec![env];
                path.push_back(asset_in.clone());
                path.push_back(asset_out.clone());
                best_route = crate::types::SwapRoute {
                    path,
                    output_amount: direct_output,
                    total_fee_bps: pool.fee_bps,
                };
            }
        }
    }

    // Try 2-hop routes through intermediate assets
    let intermediate_assets = get_available_assets(env);
    for intermediate in intermediate_assets.iter() {
        if intermediate == asset_in || intermediate == asset_out {
            continue;
        }

        if let (Ok(hop1_output), Ok(hop2_output)) = (
            get_pool_quote(env, asset_in.clone(), intermediate.clone(), amount_in),
            get_pool_quote(env, intermediate.clone(), asset_out.clone(), hop1_output),
        ) {
            if hop2_output > best_output {
                let fee1 = get_pool_fee(env, &asset_in, &intermediate).unwrap_or(0);
                let fee2 = get_pool_fee(env, &intermediate, &asset_out).unwrap_or(0);
                best_output = hop2_output;
                let mut path = soroban_sdk::vec![env];
                path.push_back(asset_in.clone());
                path.push_back(intermediate.clone());
                path.push_back(asset_out.clone());
                best_route = crate::types::SwapRoute {
                    path,
                    output_amount: hop2_output,
                    total_fee_bps: fee1 + fee2,
                };
            }
        }
    }

    // Try 3-hop routes
    for intermediate1 in intermediate_assets.iter() {
        if intermediate1 == asset_in || intermediate1 == asset_out {
            continue;
        }

        for intermediate2 in intermediate_assets.iter() {
            if intermediate2 == asset_in
                || intermediate2 == asset_out
                || intermediate2 == intermediate1
            {
                continue;
            }

            if let (Ok(hop1), Ok(hop2), Ok(hop3)) = (
                get_pool_quote(env, asset_in.clone(), intermediate1.clone(), amount_in),
                get_pool_quote(env, intermediate1.clone(), intermediate2.clone(), hop1),
                get_pool_quote(env, intermediate2.clone(), asset_out.clone(), hop2),
            ) {
                if hop3 > best_output {
                    let fee1 = get_pool_fee(env, &asset_in, intermediate1).unwrap_or(0);
                    let fee2 = get_pool_fee(env, intermediate1, intermediate2).unwrap_or(0);
                    let fee3 = get_pool_fee(env, intermediate2, &asset_out).unwrap_or(0);
                    best_output = hop3;
                    let mut path = soroban_sdk::vec![env];
                    path.push_back(asset_in.clone());
                    path.push_back(intermediate1.clone());
                    path.push_back(intermediate2.clone());
                    path.push_back(asset_out.clone());
                    best_route = crate::types::SwapRoute {
                        path,
                        output_amount: hop3,
                        total_fee_bps: fee1 + fee2 + fee3,
                    };
                }
            }
        }
    }

    if best_output == 0 {
        return Err(Error::OrderNotFound);
    }

    Ok((best_output, best_route))
}

/// Execute a multi-hop swap along the provided route path.
/// The path must have at least 2 assets (direct route) and at most 4 (3-hop route).
/// Returns the final output amount.
pub fn execute_multi_hop_swap(
    env: &Env,
    route_path: soroban_sdk::Vec<String>,
    amount_in: i128,
    min_amount_out: i128,
) -> Result<i128, Error> {
    if route_path.len() < 2 {
        return Err(Error::InvalidAmount);
    }

    let mut current_amount = amount_in;

    for i in 0..route_path.len() - 1 {
        let asset_in = route_path.get(i).ok_or(Error::InvalidAmount)?;
        let asset_out = route_path.get(i + 1).ok_or(Error::InvalidAmount)?;

        current_amount = swap_with_slippage(env, asset_in, asset_out, current_amount, 0)?;
    }

    if current_amount < min_amount_out {
        return Err(Error::AmountTooSmall);
    }

    Ok(current_amount)
}

/// Get all unique assets available in the liquidity pools.
/// Used for multi-hop route discovery.
fn get_available_assets(env: &Env) -> soroban_sdk::Vec<String> {
    let mut assets = soroban_sdk::vec![env];
    let pool_count = storage::read_pool_counter(env);

    for pool_id in 1..=pool_count {
        if let Some(pool) = storage::read_pool(env, pool_id) {
            if pool.reserve_a > 0 && pool.reserve_b > 0 {
                // Only include pools with liquidity
                if !assets.contains(&pool.asset_a) {
                    assets.push_back(pool.asset_a);
                }
                if !assets.contains(&pool.asset_b) {
                    assets.push_back(pool.asset_b);
                }
            }
        }
    }

    assets
}

/// Get the fee in basis points for a specific pool route.
fn get_pool_fee(env: &Env, asset_in: &String, asset_out: &String) -> Option<u32> {
    let pool_id = storage::read_pool_route(env, asset_in, asset_out)?;
    let pool = storage::read_pool(env, pool_id)?;
    Some(pool.fee_bps)
}
