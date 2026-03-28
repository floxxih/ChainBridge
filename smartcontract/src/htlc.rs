use crate::crypto;
use crate::error::Error;
use crate::storage;
use crate::types::{HTLCStatus, HashAlgorithm, OptMultiSig, HTLC};
use soroban_sdk::{Address, Bytes, BytesN, Env};

/// Creates a new HTLC using SHA256 as the hash algorithm (default, Bitcoin-compatible).
pub fn create_htlc(
    env: &Env,
    sender: &Address,
    receiver: &Address,
    amount: i128,
    hash_lock: BytesN<32>,
    time_lock: u64,
    multi_sig: OptMultiSig,
) -> Result<u64, Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    create_htlc_with_algorithm(
        env,
        sender,
        receiver,
        amount,
        hash_lock,
        time_lock,
        multi_sig,
        HashAlgorithm::SHA256,
    )
}

/// Creates a new HTLC with an explicitly chosen hash algorithm.
///
/// Callers that need Ethereum-compatible swaps should pass `HashAlgorithm::Keccak256`.
/// The `claim_htlc` call for this HTLC must use the same algorithm.
pub fn create_htlc_with_algorithm(
    env: &Env,
    sender: &Address,
    receiver: &Address,
    amount: i128,
    hash_lock: BytesN<32>,
    time_lock: u64,
    multi_sig: OptMultiSig,
    algorithm: HashAlgorithm,
) -> Result<u64, Error> {
    if amount <= 0 {
        return Err(Error::InvalidAmount);
    }

    let current_time = env.ledger().timestamp();
    if time_lock <= current_time {
        return Err(Error::InvalidTimelock);
    }

    let htlc_id = storage::increment_htlc_counter(env);

    let htlc = HTLC {
        sender: sender.clone(),
        receiver: receiver.clone(),
        amount,
        hash_lock,
        time_lock,
        status: HTLCStatus::Active,
        secret: None,
        created_at: current_time,
        multi_sig,
        hash_algorithm: algorithm,
    };

    storage::write_htlc(env, htlc_id, &htlc);
    Ok(htlc_id)
}

/// Claims an HTLC by revealing the secret preimage.
///
/// Uses the algorithm stored in the HTLC and constant-time comparison
/// to prevent timing-based side channel attacks.
pub fn claim_htlc(env: &Env, htlc_id: u64, secret: Bytes) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    let mut htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;

    if htlc.status != HTLCStatus::Active {
        return Err(Error::AlreadyClaimed);
    }

    let current_time = env.ledger().timestamp();
    if current_time >= htlc.time_lock {
        return Err(Error::HTLCExpired);
    }

    if let OptMultiSig::Config(config) = &htlc.multi_sig {
        if config.signatures.len() < config.threshold {
            return Err(Error::ThresholdNotMet);
        }
    }

    // Verify the secret preimage using constant-time comparison to prevent
    // timing attacks. Uses the algorithm chosen when the HTLC was created.
    if !crypto::verify_preimage(env, &secret, &htlc.hash_lock, &htlc.hash_algorithm) {
        return Err(Error::InvalidSecret);
    }

    htlc.status = HTLCStatus::Claimed;
    htlc.secret = Some(secret);
    storage::write_htlc(env, htlc_id, &htlc);

    Ok(())
}

pub fn refund_htlc(env: &Env, htlc_id: u64, sender: &Address) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    let mut htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;

    if htlc.sender != *sender {
        return Err(Error::Unauthorized);
    }

    if htlc.status == HTLCStatus::Claimed {
        return Err(Error::AlreadyClaimed);
    }
    if htlc.status == HTLCStatus::Refunded {
        return Err(Error::AlreadyRefunded);
    }

    let current_time = env.ledger().timestamp();
    if current_time < htlc.time_lock {
        return Err(Error::HTLCNotExpired);
    }

    htlc.status = HTLCStatus::Refunded;
    storage::write_htlc(env, htlc_id, &htlc);

    Ok(())
}

#[allow(dead_code)]
pub fn check_and_mark_expired(env: &Env, htlc_id: u64) -> Result<bool, Error> {
    let htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;

    if htlc.status == HTLCStatus::Active {
        let current_time = env.ledger().timestamp();
        if current_time >= htlc.time_lock {
            storage::add_expired_htlc(env, htlc_id);
            return Ok(true);
        }
    }

    Ok(false)
}

pub fn get_htlc_status(env: &Env, htlc_id: u64) -> Result<HTLCStatus, Error> {
    let htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;
    Ok(htlc.status)
}

pub fn get_revealed_secret(env: &Env, htlc_id: u64) -> Result<Option<Bytes>, Error> {
    let htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;
    Ok(htlc.secret)
}

pub fn sign_htlc(env: &Env, htlc_id: u64, signer: &Address) -> Result<(), Error> {
    if storage::is_paused(env) {
        return Err(Error::Paused);
    }

    let mut htlc = storage::read_htlc(env, htlc_id).ok_or(Error::HTLCNotFound)?;

    if htlc.status != HTLCStatus::Active {
        return Err(Error::AlreadyClaimed); // or similar error
    }

    if let OptMultiSig::Config(mut config) = htlc.multi_sig.clone() {
        if !config.signers.contains(signer) {
            return Err(Error::SignerNotAuthorized);
        }
        if !config.signatures.contains(signer) {
            config.signatures.push_back(signer.clone());
            htlc.multi_sig = OptMultiSig::Config(config);
            storage::write_htlc(env, htlc_id, &htlc);
        }
        Ok(())
    } else {
        Err(Error::SignerNotAuthorized)
    }
}
