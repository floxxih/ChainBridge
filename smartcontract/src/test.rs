#![cfg(test)]

use super::*;
use crate::types::{
    AdvancedOrderType, GovernanceConfig, HashAlgorithm, ProposalStatus, VoteChoice,
};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    Address, Bytes, BytesN, Env, String, Vec,
};

fn setup_contract() -> (Env, Address, ChainBridgeClient<'static>) {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000_000);
    let contract_id = env.register_contract(None, ChainBridge);
    let client = ChainBridgeClient::new(&env, &contract_id);
    (env, contract_id, client)
}

fn create_test_htlc(
    env: &Env,
    client: &ChainBridgeClient,
    sender: &Address,
    receiver: &Address,
    amount: i128,
    secret_bytes: &[u8; 32],
    duration_secs: u64,
) -> u64 {
    let secret = Bytes::from_slice(env, secret_bytes);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + duration_secs;
    client.create_htlc(
        sender,
        receiver,
        &amount,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    )
}

// =============================================================================
// INITIALIZATION ERROR TESTS
// =============================================================================

#[test]
fn test_init_success() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn test_error_already_initialized() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);
    client.init(&admin);
}

// =============================================================================
// AMOUNT ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_error_invalid_amount_zero_htlc() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    client.create_htlc(
        &sender,
        &receiver,
        &0,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_error_invalid_amount_negative_htlc() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    client.create_htlc(
        &sender,
        &receiver,
        &-1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_error_invalid_amount_zero_order() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;

    client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &0,
        &1000,
        &expiry,
    );
}

// =============================================================================
// TIMELOCK ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_error_invalid_timelock_past() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let past_time = env.ledger().timestamp() - 100;

    client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &past_time,
        &OptMultiSig::None,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_error_invalid_timelock_now() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let now = env.ledger().timestamp();

    client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &now,
        &OptMultiSig::None,
    );
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_error_invalid_order_expiry_past() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let past_time = env.ledger().timestamp() - 100;

    client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &past_time,
    );
}

// =============================================================================
// HTLC NOT FOUND ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_error_htlc_not_found_get() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);

    client.get_htlc(&999);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_error_htlc_not_found_claim() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let receiver = Address::generate(&env);
    let secret = Bytes::from_slice(&env, &[1u8; 32]);

    client.init(&admin);

    client.claim_htlc(&receiver, &999, &secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #5)")]
fn test_error_htlc_not_found_refund() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);

    client.init(&admin);

    client.refund_htlc(&sender, &999);
}

// =============================================================================
// UNAUTHORIZED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_error_unauthorized_refund_wrong_sender() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);
    let wrong_sender = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 100);

    env.ledger().set_timestamp(env.ledger().timestamp() + 200);

    client.refund_htlc(&wrong_sender, &htlc_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_error_unauthorized_cancel_order_wrong_creator() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let wrong_user = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    client.cancel_order(&wrong_user, &order_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #3)")]
fn test_error_unauthorized_add_chain() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let non_admin = Address::generate(&env);

    client.init(&admin);

    client.add_chain(&non_admin, &1);
}

// =============================================================================
// SECRET/HASH VALIDATION ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_error_invalid_secret_wrong_secret() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let original_secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&original_secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    let wrong_secret = Bytes::from_slice(&env, &[2u8; 32]);
    client.claim_htlc(&receiver, &htlc_id, &wrong_secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_error_invalid_secret_empty_secret() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 86400);

    let empty_secret = Bytes::from_slice(&env, &[]);
    client.claim_htlc(&receiver, &htlc_id, &empty_secret);
}

// =============================================================================
// ALREADY CLAIMED/REFUNDED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_error_already_claimed_double_claim() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    client.claim_htlc(&receiver, &htlc_id, &secret);
    client.claim_htlc(&receiver, &htlc_id, &secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #10)")]
fn test_error_already_refunded_double_refund() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 100);

    env.ledger().set_timestamp(env.ledger().timestamp() + 200);

    client.refund_htlc(&sender, &htlc_id);
    client.refund_htlc(&sender, &htlc_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #9)")]
fn test_error_already_claimed_cannot_refund() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    client.claim_htlc(&receiver, &htlc_id, &secret);

    env.ledger().set_timestamp(env.ledger().timestamp() + 86500);

    client.refund_htlc(&sender, &htlc_id);
}

// =============================================================================
// HTLC EXPIRED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_error_htlc_expired_claim_after_timeout() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 100;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    env.ledger().set_timestamp(time_lock + 1);

    client.claim_htlc(&receiver, &htlc_id, &secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #6)")]
fn test_error_htlc_expired_claim_at_exact_timeout() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 100;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    env.ledger().set_timestamp(time_lock);

    client.claim_htlc(&receiver, &htlc_id, &secret);
}

// =============================================================================
// HTLC NOT EXPIRED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_error_htlc_not_expired_refund_too_early() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 86400);

    client.refund_htlc(&sender, &htlc_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #7)")]
fn test_error_htlc_not_expired_refund_before_timeout() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 100);

    env.ledger().set_timestamp(env.ledger().timestamp() + 50);

    client.refund_htlc(&sender, &htlc_id);
}

// =============================================================================
// ORDER NOT FOUND ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_error_order_not_found_get() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);

    client.get_order(&999);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_error_order_not_found_match() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    client.match_order(&counterparty, &999);
}

#[test]
#[should_panic(expected = "Error(Contract, #13)")]
fn test_error_order_not_found_cancel() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    client.cancel_order(&creator, &999);
}

// =============================================================================
// ORDER ALREADY MATCHED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_error_order_already_matched_double_match() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty1 = Address::generate(&env);
    let counterparty2 = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    client.match_order(&counterparty1, &order_id);
    client.match_order(&counterparty2, &order_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #14)")]
fn test_error_order_already_matched_cannot_cancel() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    client.match_order(&counterparty, &order_id);
    client.cancel_order(&creator, &order_id);
}

// =============================================================================
// ORDER EXPIRED ERROR TESTS
// =============================================================================

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_error_order_expired_match_after_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 100;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    env.ledger().set_timestamp(expiry + 1);

    client.match_order(&counterparty, &order_id);
}

#[test]
#[should_panic(expected = "Error(Contract, #15)")]
fn test_error_order_expired_match_at_exact_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 100;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    env.ledger().set_timestamp(expiry);

    client.match_order(&counterparty, &order_id);
}

// =============================================================================
// SUCCESSFUL OPERATION TESTS
// =============================================================================

#[test]
fn test_htlc_claim_before_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    env.ledger().set_timestamp(env.ledger().timestamp() + 43200);

    client.claim_htlc(&receiver, &htlc_id, &secret);

    let status = client.get_htlc_status(&htlc_id);
    assert_eq!(status, HTLCStatus::Claimed);
}

#[test]
fn test_htlc_refund_after_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 100);

    env.ledger().set_timestamp(env.ledger().timestamp() + 101);

    client.refund_htlc(&sender, &htlc_id);

    let status = client.get_htlc_status(&htlc_id);
    assert_eq!(status, HTLCStatus::Refunded);
}

#[test]
fn test_order_match_before_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    env.ledger().set_timestamp(env.ledger().timestamp() + 43200);

    let swap_id = client.match_order(&counterparty, &order_id);
    assert!(swap_id > 0);
}

#[test]
fn test_order_cancel_before_match() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    client.cancel_order(&creator, &order_id);
}

// =============================================================================
// EDGE CASE TESTS
// =============================================================================

#[test]
fn test_htlc_claim_one_second_before_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 100;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    env.ledger().set_timestamp(time_lock - 1);

    client.claim_htlc(&receiver, &htlc_id, &secret);

    let status = client.get_htlc_status(&htlc_id);
    assert_eq!(status, HTLCStatus::Claimed);
}

#[test]
fn test_htlc_refund_one_second_after_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 100);

    env.ledger().set_timestamp(env.ledger().timestamp() + 101);

    client.refund_htlc(&sender, &htlc_id);

    let status = client.get_htlc_status(&htlc_id);
    assert_eq!(status, HTLCStatus::Refunded);
}

#[test]
fn test_order_match_one_second_before_expiry() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 100;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &1000,
        &expiry,
    );

    env.ledger().set_timestamp(expiry - 1);

    let swap_id = client.match_order(&counterparty, &order_id);
    assert!(swap_id > 0);
}

// =============================================================================
// MULTIPLE HTLC TESTS
// =============================================================================

#[test]
fn test_multiple_htlcs_different_secrets() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc1_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 86400);
    let htlc2_id = create_test_htlc(&env, &client, &sender, &receiver, 2000, &[2u8; 32], 86400);
    let htlc3_id = create_test_htlc(&env, &client, &sender, &receiver, 3000, &[3u8; 32], 86400);

    assert_ne!(htlc1_id, htlc2_id);
    assert_ne!(htlc2_id, htlc3_id);
    assert_ne!(htlc1_id, htlc3_id);

    let htlc1 = client.get_htlc(&htlc1_id);
    let htlc2 = client.get_htlc(&htlc2_id);
    let htlc3 = client.get_htlc(&htlc3_id);

    assert_eq!(htlc1.amount, 1000);
    assert_eq!(htlc2.amount, 2000);
    assert_eq!(htlc3.amount, 3000);
}

#[test]
fn test_claim_different_htlcs_different_secrets() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc1_id = create_test_htlc(&env, &client, &sender, &receiver, 1000, &[1u8; 32], 86400);
    let htlc2_id = create_test_htlc(&env, &client, &sender, &receiver, 2000, &[2u8; 32], 86400);

    let secret1 = Bytes::from_slice(&env, &[1u8; 32]);
    let secret2 = Bytes::from_slice(&env, &[2u8; 32]);

    client.claim_htlc(&receiver, &htlc1_id, &secret1);
    client.claim_htlc(&receiver, &htlc2_id, &secret2);

    assert_eq!(client.get_htlc_status(&htlc1_id), HTLCStatus::Claimed);
    assert_eq!(client.get_htlc_status(&htlc2_id), HTLCStatus::Claimed);
}

// =============================================================================
// ISSUE #12: SECRET VERIFICATION AND HASH ALGORITHMS
// =============================================================================

#[test]
fn test_keccak256_htlc_create_and_claim() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[0xabu8; 32]);
    let hash_lock: BytesN<32> = env.crypto().keccak256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc_with_algo(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &HashAlgorithm::Keccak256,
    );

    client.claim_htlc(&receiver, &htlc_id, &secret);

    assert_eq!(client.get_htlc_status(&htlc_id), HTLCStatus::Claimed);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_keccak256_htlc_rejects_sha256_secret() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[0xabu8; 32]);
    // Lock with keccak256 but present the raw secret to a SHA256-locked HTLC equivalent
    let keccak_hash: BytesN<32> = env.crypto().keccak256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc_with_algo(
        &sender,
        &receiver,
        &1000,
        &keccak_hash,
        &time_lock,
        &HashAlgorithm::SHA256,
    );

    // SHA256(secret) != keccak256(secret), so this must fail
    client.claim_htlc(&receiver, &htlc_id, &secret);
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn test_sha256_htlc_rejects_keccak256_secret() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[0x42u8; 32]);
    let sha256_hash: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    // Lock with SHA256 (default)
    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &sha256_hash,
        &time_lock,
        &OptMultiSig::None,
    );

    // Build a keccak-based HTLC and try to claim the SHA256 one with the wrong hash
    let wrong_hash = env.crypto().keccak256(&secret);
    // Use wrong_hash as a secret that hashes to something different under SHA256
    let wrong_secret = Bytes::from_array(&env, &wrong_hash.to_array());
    client.claim_htlc(&receiver, &htlc_id, &wrong_secret);
}

#[test]
fn test_generate_htlc_secret_returns_32_bytes() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);

    let secret: BytesN<32> = client.generate_htlc_secret();
    // BytesN<32> guarantees 32 bytes at compile time; verify it is non-zero
    let arr = secret.to_array();
    // With overwhelming probability the PRNG output is not all-zeros
    let is_nonzero = arr.iter().any(|&b| b != 0);
    assert!(is_nonzero);
}

#[test]
fn test_sha256_htlc_stores_algorithm() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );
    let htlc = client.get_htlc(&htlc_id);

    assert_eq!(htlc.hash_algorithm, HashAlgorithm::SHA256);
}

#[test]
fn test_keccak256_htlc_stores_algorithm() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[1u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().keccak256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc_with_algo(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &HashAlgorithm::Keccak256,
    );
    let htlc = client.get_htlc(&htlc_id);

    assert_eq!(htlc.hash_algorithm, HashAlgorithm::Keccak256);
}

#[test]
fn test_get_revealed_secret_after_claim() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[0x99u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 86400;

    let htlc_id = client.create_htlc(
        &sender,
        &receiver,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    assert_eq!(client.get_secret(&htlc_id), None);

    client.claim_htlc(&receiver, &htlc_id, &secret);

    assert_eq!(client.get_secret(&htlc_id), Some(secret));
}

// =============================================================================
// ISSUE #16: ORDER MATCHING ALGORITHM
// =============================================================================

#[test]
fn test_partial_fill_order_stays_open() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    // min_fill_amount = 250, from_amount = 1000
    let order_id = client.create_order_with_min_fill(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
        &250,
        &AdvancedOrderType::Market,
        &None,
    );

    client.match_order_partial(&counterparty, &order_id, &250);

    let order = client.get_order(&order_id);
    // Still open - only 250 of 1000 filled
    assert_eq!(order.status, crate::types::SwapStatus::Open);
    assert_eq!(order.filled_amount, 250);
}

#[test]
fn test_partial_fill_multiple_fills_completes_order() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let cp1 = Address::generate(&env);
    let cp2 = Address::generate(&env);
    let cp3 = Address::generate(&env);
    let cp4 = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order_with_min_fill(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
        &250,
        &AdvancedOrderType::Market,
        &None,
    );

    client.match_order_partial(&cp1, &order_id, &250);
    client.match_order_partial(&cp2, &order_id, &250);
    client.match_order_partial(&cp3, &order_id, &250);
    client.match_order_partial(&cp4, &order_id, &250);

    let order = client.get_order(&order_id);
    assert_eq!(order.status, crate::types::SwapStatus::Completed);
    assert_eq!(order.filled_amount, 1000);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_partial_fill_below_min_fill_rejected() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order_with_min_fill(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
        &250,
        &AdvancedOrderType::Market,
        &None,
    );

    // 249 < min_fill_amount (250)
    client.match_order_partial(&counterparty, &order_id, &249);
}

#[test]
#[should_panic(expected = "Error(Contract, #4)")]
fn test_partial_fill_above_remaining_rejected() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order_with_min_fill(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
        &250,
        &AdvancedOrderType::Market,
        &None,
    );

    // 1001 > from_amount (1000)
    client.match_order_partial(&counterparty, &order_id, &1001);
}

#[test]
fn test_chain_pair_index_populated_on_create() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    let ids = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    assert_eq!(ids.len(), 1);
    assert_eq!(ids.get(0).unwrap(), order_id);
}

#[test]
fn test_chain_pair_index_removed_on_full_match() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    client.match_order(&counterparty, &order_id);

    let ids = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    assert_eq!(ids.len(), 0);
}

#[test]
fn test_chain_pair_index_removed_on_cancel() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    client.cancel_order(&creator, &order_id);

    let ids = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    assert_eq!(ids.len(), 0);
}

#[test]
fn test_expire_order_removes_from_index() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 100;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    env.ledger().set_timestamp(expiry + 1);
    client.expire_order(&order_id);

    let order = client.get_order(&order_id);
    assert_eq!(order.status, crate::types::SwapStatus::Expired);

    let ids = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    assert_eq!(ids.len(), 0);
}

#[test]
#[should_panic(expected = "Error(Contract, #12)")]
fn test_expire_order_before_expiry_fails() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    client.expire_order(&order_id);
}

#[test]
fn test_multiple_orders_same_chain_pair() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator1 = Address::generate(&env);
    let creator2 = Address::generate(&env);
    let creator3 = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;

    let id1 = client.create_order(
        &creator1,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );
    let id2 = client.create_order(
        &creator2,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &2000,
        &3800,
        &expiry,
    );
    let id3 = client.create_order(
        &creator3,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &500,
        &1050,
        &expiry,
    );

    let ids = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    assert_eq!(ids.len(), 3);
    assert_eq!(ids.get(0).unwrap(), id1);
    assert_eq!(ids.get(1).unwrap(), id2);
    assert_eq!(ids.get(2).unwrap(), id3);
}

#[test]
fn test_orders_different_chain_pairs_isolated() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;

    client.create_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );
    client.create_order(
        &creator,
        &Chain::Solana,
        &Chain::Polygon,
        &String::from_str(&env, "SOL"),
        &String::from_str(&env, "MATIC"),
        &1000,
        &5000,
        &expiry,
    );

    let btc_eth = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Ethereum);
    let sol_matic = client.get_orders_by_chain_pair(&Chain::Solana, &Chain::Polygon);
    let btc_sol = client.get_orders_by_chain_pair(&Chain::Bitcoin, &Chain::Solana);

    assert_eq!(btc_eth.len(), 1);
    assert_eq!(sol_matic.len(), 1);
    assert_eq!(btc_sol.len(), 0);
}

// =============================================================================
// ISSUE #10: INTEGRATION TESTING FRAMEWORK
// =============================================================================

/// Full atomic swap flow: Stellar HTLC locked, claimed cross-chain, secret revealed.
#[test]
fn test_full_atomic_swap_flow() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.init(&admin);

    // Alice creates an order to sell BTC for ETH
    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order(
        &alice,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1000,
        &2000,
        &expiry,
    );

    // Bob matches Alice's order
    let swap_id = client.match_order(&bob, &order_id);
    assert!(swap_id > 0);

    // Alice creates HTLC to lock funds for Bob
    let secret = Bytes::from_slice(&env, &[0x11u8; 32]);
    let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
    let time_lock = env.ledger().timestamp() + 7200;
    let htlc_id = client.create_htlc(
        &alice,
        &bob,
        &1000,
        &hash_lock,
        &time_lock,
        &OptMultiSig::None,
    );

    // Bob claims the HTLC by revealing the secret
    client.claim_htlc(&bob, &htlc_id, &secret);

    // Verify final state
    assert_eq!(client.get_htlc_status(&htlc_id), HTLCStatus::Claimed);
    assert_eq!(client.get_secret(&htlc_id), Some(secret));
}

/// Cross-chain swap using Keccak256 (Ethereum-compatible).
#[test]
fn test_ethereum_compatible_swap_keccak256() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let stellar_party = Address::generate(&env);
    let eth_party = Address::generate(&env);

    client.init(&admin);

    let secret = Bytes::from_slice(&env, &[0xdeu8; 32]);
    let hash_lock: BytesN<32> = env.crypto().keccak256(&secret).into();
    let time_lock = env.ledger().timestamp() + 3600;

    let htlc_id = client.create_htlc_with_algo(
        &stellar_party,
        &eth_party,
        &5000,
        &hash_lock,
        &time_lock,
        &HashAlgorithm::Keccak256,
    );

    client.claim_htlc(&eth_party, &htlc_id, &secret);
    assert_eq!(client.get_htlc_status(&htlc_id), HTLCStatus::Claimed);
}

/// Multi-party partial fill: 5 different counterparties each fill 200 of 1000.
#[test]
fn test_multi_party_partial_fill() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let order_id = client.create_order_with_min_fill(
        &creator,
        &Chain::Bitcoin,
        &Chain::Solana,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "SOL"),
        &1000,
        &15000,
        &expiry,
        &200,
        &AdvancedOrderType::Market,
        &None,
    );

    for _ in 0..5 {
        let cp = Address::generate(&env);
        client.match_order_partial(&cp, &order_id, &200);
    }

    let order = client.get_order(&order_id);
    assert_eq!(order.status, crate::types::SwapStatus::Completed);
    assert_eq!(order.filled_amount, 1000);
}

/// Refund path: HTLC times out and sender reclaims funds.
#[test]
fn test_htlc_timeout_and_refund() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let htlc_id = create_test_htlc(&env, &client, &sender, &receiver, 5000, &[0x55u8; 32], 100);

    // Advance past timeout
    env.ledger().set_timestamp(env.ledger().timestamp() + 101);

    client.refund_htlc(&sender, &htlc_id);
    assert_eq!(client.get_htlc_status(&htlc_id), HTLCStatus::Refunded);
}

/// Stress test: create 20 HTLCs and claim/refund alternately.
#[test]
fn test_stress_20_htlcs() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let sender = Address::generate(&env);
    let receiver = Address::generate(&env);

    client.init(&admin);

    let mut htlc_ids = soroban_sdk::Vec::new(&env);

    for i in 0u8..20 {
        let secret = Bytes::from_slice(&env, &[i; 32]);
        let hash_lock: BytesN<32> = env.crypto().sha256(&secret).into();
        let time_lock = env.ledger().timestamp() + 86400;
        let htlc_id = client.create_htlc(
            &sender,
            &receiver,
            &((i as i128 + 1) * 100),
            &hash_lock,
            &time_lock,
            &OptMultiSig::None,
        );
        htlc_ids.push_back(htlc_id);
    }

    // Claim even-indexed HTLCs, skip odd (leave active)
    for i in 0u8..20 {
        if i % 2 == 0 {
            let htlc_id = htlc_ids.get(i as u32).unwrap();
            let secret = Bytes::from_slice(&env, &[i; 32]);
            client.claim_htlc(&receiver, &htlc_id, &secret);
            assert_eq!(client.get_htlc_status(&htlc_id), HTLCStatus::Claimed);
        }
    }

    let metrics = client.get_storage_metrics();
    assert_eq!(metrics.total_htlcs, 20);
    assert_eq!(metrics.active_htlcs, 10);
}

/// Stress test: create 10 orders on the same chain pair and verify index integrity.
#[test]
fn test_stress_10_orders_chain_pair_index() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;
    let mut created_ids = soroban_sdk::Vec::new(&env);

    for _ in 0..10 {
        let creator = Address::generate(&env);
        let order_id = client.create_order(
            &creator,
            &Chain::Ethereum,
            &Chain::BSC,
            &String::from_str(&env, "ETH"),
            &String::from_str(&env, "BNB"),
            &1000,
            &3000,
            &expiry,
        );
        created_ids.push_back(order_id);
    }

    let indexed = client.get_orders_by_chain_pair(&Chain::Ethereum, &Chain::BSC);
    assert_eq!(indexed.len(), 10);

    // Cancel 3 orders and verify they are removed from the index
    for i in 0u32..3 {
        let order_id = created_ids.get(i).unwrap();
        let order = client.get_order(&order_id);
        client.cancel_order(&order.creator, &order_id);
    }

    let remaining = client.get_orders_by_chain_pair(&Chain::Ethereum, &Chain::BSC);
    assert_eq!(remaining.len(), 7);
}

/// Verify `get_storage_metrics` accurately reflects open orders.
#[test]
fn test_storage_metrics_reflect_open_orders() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let counterparty = Address::generate(&env);

    client.init(&admin);

    let expiry = env.ledger().timestamp() + 86400;

    // Create 3 orders
    let ids: [u64; 3] = core::array::from_fn(|_| {
        client.create_order(
            &creator,
            &Chain::Bitcoin,
            &Chain::Ethereum,
            &String::from_str(&env, "BTC"),
            &String::from_str(&env, "ETH"),
            &1000,
            &2000,
            &expiry,
        )
    });

    let metrics_before = client.get_storage_metrics();
    assert_eq!(metrics_before.open_orders, 3);

    // Match one order
    client.match_order(&counterparty, &ids[0]);

    let metrics_after = client.get_storage_metrics();
    assert_eq!(metrics_after.open_orders, 2);
    assert_eq!(metrics_after.total_orders, 3);
}

#[test]
fn test_governance_proposal_lifecycle() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let proposer = Address::generate(&env);
    let voter = Address::generate(&env);

    client.init(&admin);
    client.init_governance(
        &admin,
        &GovernanceConfig {
            token_symbol: String::from_str(&env, "CBG"),
            quorum_bps: 2_000,
            proposal_threshold: 100,
            voting_period_secs: 100,
            timelock_secs: 10,
        },
    );

    let mut actions = soroban_sdk::Vec::new(&env);
    actions.push_back(String::from_str(&env, "set_fee_rate:25"));
    let proposal_id = client.create_proposal(
        &proposer,
        &String::from_str(&env, "Lower protocol fee"),
        &String::from_str(&env, "Reduce taker fees via governance"),
        &actions,
        &500,
    );

    client.cast_vote(&voter, &proposal_id, &VoteChoice::For, &500);
    env.ledger().set_timestamp(env.ledger().timestamp() + 120);
    client.execute_proposal(&proposal_id);

    let proposal = client.get_proposal(&proposal_id);
    assert_eq!(proposal.status, ProposalStatus::Executed);
}

#[test]
fn test_liquidity_pool_quote_and_rewards() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let provider = Address::generate(&env);

    client.init(&admin);
    let pool_id = client.create_pool(
        &String::from_str(&env, "XLM"),
        &String::from_str(&env, "USDC"),
        &30,
        &500,
    );

    let minted = client.add_liquidity(&provider, &pool_id, &10_000, &20_000);
    let quote = client.get_pool_quote(
        &String::from_str(&env, "XLM"),
        &String::from_str(&env, "USDC"),
        &1_000,
    );
    let position = client.get_position(&pool_id, &provider);

    assert!(minted > 0);
    assert!(quote > 0);
    assert!(position.rewards_earned > 0);
}

#[test]
fn test_advanced_order_amendment_and_referral_tracking() {
    let (env, _, client) = setup_contract();
    let admin = Address::generate(&env);
    let creator = Address::generate(&env);
    let owner = Address::generate(&env);

    client.init(&admin);
    let expiry = env.ledger().timestamp() + 1_000;
    let order_id = client.create_advanced_order(
        &creator,
        &Chain::Bitcoin,
        &Chain::Ethereum,
        &String::from_str(&env, "BTC"),
        &String::from_str(&env, "ETH"),
        &1_000,
        &2_000,
        &expiry,
        &250,
        &AdvancedOrderType::Limit,
        &Some(crate::types::OrderExecutionCondition {
            trigger_price_numerator: 2,
            trigger_price_denominator: 1,
            execute_after: env.ledger().timestamp(),
            allow_partial_fills: true,
        }),
    );

    client.amend_order(&creator, &order_id, &2_200, &(expiry + 100), &None);
    let order = client.get_order(&order_id);
    assert_eq!(order.amendment_count, 1);
    assert_eq!(order.to_amount, 2_200);

    client.register_referral_code(&owner, &String::from_str(&env, "FROST"));
    client.record_referral_swap(&String::from_str(&env, "FROST"), &77, &10_000);
    let referral = client.get_referral_record(&String::from_str(&env, "FROST"));
    assert_eq!(referral.uses, 1);
    assert_eq!(referral.rewards_earned, 100);
}
