use crate::error::Error;
use crate::storage;
use crate::types::ReferralRecord;
use soroban_sdk::{Address, Env, String};

pub fn register_referral_code(env: &Env, owner: &Address, code: String) -> Result<(), Error> {
    if code.len() < 4 {
        return Err(Error::InvalidAmount);
    }
    if storage::read_referral_record(env, &code).is_some() {
        return Err(Error::AlreadyInitialized);
    }

    let record = ReferralRecord {
        owner: owner.clone(),
        code,
        uses: 0,
        rewards_earned: 0,
        last_swap_id: 0,
    };
    storage::write_referral_record(env, &record);
    Ok(())
}

pub fn record_referral_swap(
    env: &Env,
    code: String,
    swap_id: u64,
    notional_amount: i128,
) -> Result<(), Error> {
    let mut record = storage::read_referral_record(env, &code).ok_or(Error::OrderNotFound)?;
    record.uses += 1;
    record.last_swap_id = swap_id;
    record.rewards_earned += notional_amount / 100;
    storage::write_referral_record(env, &record);
    Ok(())
}
