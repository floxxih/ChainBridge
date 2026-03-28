use crate::error::Error;
use crate::storage;
use crate::types::{AdvancedOrderType, Chain, OrderExecutionCondition, SwapOrder, SwapStatus};
use soroban_sdk::{Address, Env, String};

#[allow(clippy::too_many_arguments)]
/// Create an order with the full amount as the minimum fill (no partial fills).
pub fn create_order(
    env: &Env,
    creator: &Address,
    from_chain: Chain,
    to_chain: Chain,
    from_asset: String,
    to_asset: String,
    from_amount: i128,
    to_amount: i128,
    expiry: u64,
) -> Result<u64, Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    create_order_with_min_fill(
        env,
        creator,
        from_chain,
        to_chain,
        from_asset,
        to_asset,
        from_amount,
        to_amount,
        expiry,
        from_amount,
        AdvancedOrderType::Market,
        None,
    )
}

/// Create an order with an explicit minimum fill amount.
///
/// Setting `min_fill_amount < from_amount` enables partial fills: a single
/// `match_order_partial` call may fill only part of the order, leaving the
/// remainder open for subsequent matches.
///
/// Orders are added to the chain-pair index so counterparties can discover
/// them in O(1) via `get_orders_by_chain_pair`.
#[allow(clippy::too_many_arguments)]
pub fn create_order_with_min_fill(
    env: &Env,
    creator: &Address,
    from_chain: Chain,
    to_chain: Chain,
    from_asset: String,
    to_asset: String,
    from_amount: i128,
    to_amount: i128,
    expiry: u64,
    min_fill_amount: i128,
    order_type: AdvancedOrderType,
    execution: Option<OrderExecutionCondition>,
) -> Result<u64, Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }
    if from_amount <= 0 || to_amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    if min_fill_amount <= 0 || min_fill_amount > from_amount {
        return Err(Error::InvalidAmount);
    }

    let current_time = env.ledger().timestamp();
    if expiry <= current_time {
        return Err(Error::InvalidTimelock);
    }

    let order_id = storage::increment_order_counter(env);

    let order = SwapOrder {
        id: order_id,
        creator: creator.clone(),
        from_chain: from_chain.clone(),
        to_chain: to_chain.clone(),
        from_asset,
        to_asset,
        from_amount,
        to_amount,
        expiry,
        status: SwapStatus::Open,
        counterparty: None,
        min_fill_amount,
        filled_amount: 0,
        created_ledger: env.ledger().sequence(),
        order_type,
        execution,
        amendment_count: 0,
    };

    storage::write_order(env, order_id, &order);
    storage::add_order_to_chain_index(env, &from_chain, &to_chain, order_id);
    Ok(order_id)
}

#[allow(clippy::too_many_arguments)]
pub fn create_advanced_order(
    env: &Env,
    creator: &Address,
    from_chain: Chain,
    to_chain: Chain,
    from_asset: String,
    to_asset: String,
    from_amount: i128,
    to_amount: i128,
    expiry: u64,
    min_fill_amount: i128,
    order_type: AdvancedOrderType,
    execution: Option<OrderExecutionCondition>,
) -> Result<u64, Error> {
    create_order_with_min_fill(
        env,
        creator,
        from_chain,
        to_chain,
        from_asset,
        to_asset,
        from_amount,
        to_amount,
        expiry,
        min_fill_amount,
        order_type,
        execution,
    )
}

/// Fully match an open order.
///
/// Equivalent to `match_order_partial` with `fill_amount = remaining amount`.
pub fn match_order(env: &Env, counterparty: &Address, order_id: u64) -> Result<u64, Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    let order = storage::read_order(env, order_id).ok_or(Error::OrderNotFound)?;
    let remaining = order.from_amount - order.filled_amount;
    match_order_partial(env, counterparty, order_id, remaining)
}

/// Partially or fully match an open order.
///
/// `fill_amount` must be >= `min_fill_amount` and <= unfilled remainder.
/// When the order becomes fully filled its status changes to `Completed`
/// and it is removed from the chain-pair index.
///
/// Price-time priority: callers should query `get_orders_by_chain_pair` and
/// select the order with the best price ratio (to_amount / from_amount).
/// Among equal-priced orders, the one with the lower `created_ledger` value
/// (created earlier) should be matched first.
pub fn match_order_partial(
    env: &Env,
    counterparty: &Address,
    order_id: u64,
    fill_amount: i128,
) -> Result<u64, Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }
    let mut order = storage::read_order(env, order_id).ok_or(Error::OrderNotFound)?;

    if order.status != SwapStatus::Open {
        return Err(Error::OrderAlreadyMatched);
    }

    let current_time = env.ledger().timestamp();
    if current_time >= order.expiry {
        return Err(Error::OrderExpired);
    }

    let remaining = order.from_amount - order.filled_amount;

    if fill_amount < order.min_fill_amount || fill_amount > remaining {
        return Err(Error::InvalidAmount);
    }

    order.filled_amount += fill_amount;
    order.counterparty = Some(counterparty.clone());

    if order.filled_amount >= order.from_amount {
        order.status = SwapStatus::Completed;
        storage::remove_order_from_chain_index(env, &order.from_chain, &order.to_chain, order_id);
    }

    storage::write_order(env, order_id, &order);

    let swap_id = storage::increment_swap_counter(env);
    let swap = crate::types::CrossChainSwap {
        id: swap_id,
        stellar_htlc_id: 0,
        other_chain: order.from_chain.clone(),
        other_chain_tx: String::from_str(env, ""),
        stellar_party: counterparty.clone(),
        other_party: String::from_str(env, ""),
        state: crate::types::SwapState::Initiated,
        updated_at: current_time,
    };
    storage::write_swap(env, swap_id, &swap);

    Ok(swap_id)
}

/// Cancel an open order. Only the creator may cancel.
///
/// Removes the order from the chain-pair index.
pub fn cancel_order(env: &Env, creator: &Address, order_id: u64) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    let order = storage::read_order(env, order_id).ok_or(Error::OrderNotFound)?;

    if order.creator != *creator {
        return Err(Error::Unauthorized);
    }

    if order.status != SwapStatus::Open {
        return Err(Error::OrderAlreadyMatched);
    }

    storage::remove_order_from_chain_index(env, &order.from_chain, &order.to_chain, order_id);
    storage::remove_order(env, order_id);
    Ok(())
}

/// Mark an expired open order as `Expired` and remove it from the index.
///
/// Anyone may call this to clean up stale open orders after their expiry.
pub fn expire_order(env: &Env, order_id: u64) -> Result<(), Error> {
    let mut order = storage::read_order(env, order_id).ok_or(Error::OrderNotFound)?;

    if order.status != SwapStatus::Open {
        return Ok(());
    }

    let current_time = env.ledger().timestamp();
    if current_time < order.expiry {
        return Err(Error::InvalidTimelock);
    }

    order.status = SwapStatus::Expired;
    storage::remove_order_from_chain_index(env, &order.from_chain, &order.to_chain, order_id);
    storage::write_order(env, order_id, &order);
    Ok(())
}

pub fn amend_order(
    env: &Env,
    creator: &Address,
    order_id: u64,
    to_amount: i128,
    expiry: u64,
    execution: Option<OrderExecutionCondition>,
) -> Result<(), Error> {
    let mut order = storage::read_order(env, order_id).ok_or(Error::OrderNotFound)?;
    if order.creator != *creator {
        return Err(Error::Unauthorized);
    }
    if order.status != SwapStatus::Open {
        return Err(Error::OrderAlreadyMatched);
    }
    if to_amount <= 0 || expiry <= env.ledger().timestamp() {
        return Err(Error::InvalidAmount);
    }

    order.to_amount = to_amount;
    order.expiry = expiry;
    order.execution = execution;
    order.amendment_count += 1;
    storage::write_order(env, order_id, &order);
    Ok(())
}
