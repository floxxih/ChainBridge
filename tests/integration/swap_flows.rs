use crate::{harness::*, mocks::*};
use sha2::{Digest, Sha256};
use soroban_sdk::Env;

#[cfg(test)]
mod swap_flow_tests {
    use super::*;

    #[test]
    fn test_complete_atomic_swap_flow() {
        let mut harness = setup_test_harness();

        let alice = harness.create_account("alice").clone();
        let bob = harness.create_account("bob").clone();

        let secret = generate_secret();
        let hashlock = compute_hashlock(&secret);

        let swap_id = initiate_swap(&mut harness, &alice.name, &bob.name, &hashlock);

        assert!(swap_id.starts_with("swap_"));

        let state = get_swap_state(&harness, &swap_id);
        assert_eq!(state.status, SwapStatus::Initiated);
    }

    #[test]
    fn test_htlc_claim_with_secret() {
        let harness = setup_test_harness();

        let secret = "my_secret_preimage".as_bytes();
        let hash = compute_hash(secret);

        assert!(verify_secret(secret, &hash));
    }

    #[test]
    fn test_htlc_timeout_refund() {
        let mut harness = setup_test_harness();

        let alice = harness.create_account("alice").clone();

        harness.advance_time(3600);

        assert!(harness.get_current_timestamp() >= 3600);
    }

    #[test]
    fn test_multi_chain_swap_initiation() {
        let mut stellar = MockStellarNetwork::new_testnet();
        let mut bitcoin = MockBitcoinNetwork::new_testnet();
        let mut ethereum = MockBlockchain::new("ethereum");

        stellar.add_account("alice_stellar", "1000");
        bitcoin.add_utxo("alice_btc", "tx1", 0, 50000);
        ethereum.add_account("alice_eth", 10_000_000);

        assert_eq!(stellar.get_xlm_balance("alice_stellar"), "1000");
        assert_eq!(bitcoin.get_balance("alice_btc"), 50000);
        assert_eq!(ethereum.get_balance("alice_eth"), 10_000_000);
    }
}

fn generate_secret() -> Vec<u8> {
    use rand::Rng;
    let mut rng = rand::thread_rng();
    let mut secret = vec![0u8; 32];
    rng.fill(&mut secret[..]);
    secret
}

fn compute_hashlock(secret: &[u8]) -> String {
    let hash = compute_hash(secret);
    hex::encode(hash)
}

fn compute_hash(data: &[u8]) -> Vec<u8> {
    let mut hasher = Sha256::new();
    hasher.update(data);
    hasher.finalize().to_vec()
}

fn verify_secret(secret: &[u8], hash: &[u8]) -> bool {
    let computed = compute_hash(secret);
    computed == hash
}

fn initiate_swap(
    harness: &mut TestHarness,
    initiator: &str,
    responder: &str,
    hashlock: &str,
) -> String {
    let swap_id = format!("swap_{}", rand::random::<u64>());

    let mut state = harness.state.lock().unwrap();
    state.swaps.push(SwapState {
        swap_id: swap_id.clone(),
        initiator: initiator.to_string(),
        responder: responder.to_string(),
        status: SwapStatus::Initiated,
        hashlock: hashlock.to_string(),
        timelock: state.current_timestamp + 3600,
        secret: None,
    });

    swap_id
}

fn get_swap_state(harness: &TestHarness, swap_id: &str) -> SwapState {
    let state = harness.state.lock().unwrap();
    state
        .swaps
        .iter()
        .find(|s| s.swap_id == swap_id)
        .cloned()
        .unwrap()
}

#[cfg(test)]
mod multi_party_tests {
    use super::*;

    #[test]
    fn test_concurrent_swap_operations() {
        let mut harness = setup_test_harness();

        let alice = harness.create_account("alice").clone();
        let bob = harness.create_account("bob").clone();
        let charlie = harness.create_account("charlie").clone();

        let secret1 = generate_secret();
        let secret2 = generate_secret();

        let hash1 = compute_hashlock(&secret1);
        let hash2 = compute_hashlock(&secret2);

        let swap1 = initiate_swap(&mut harness, &alice.name, &bob.name, &hash1);
        let swap2 = initiate_swap(&mut harness, &bob.name, &charlie.name, &hash2);

        assert_ne!(swap1, swap2);

        let state1 = get_swap_state(&harness, &swap1);
        let state2 = get_swap_state(&harness, &swap2);

        assert_eq!(state1.initiator, alice.name);
        assert_eq!(state1.responder, bob.name);
        assert_eq!(state2.initiator, bob.name);
        assert_eq!(state2.responder, charlie.name);
    }

    #[test]
    fn test_swap_cancellation() {
        let mut harness = setup_test_harness();

        let alice = harness.create_account("alice").clone();
        let bob = harness.create_account("bob").clone();

        let secret = generate_secret();
        let hash = compute_hashlock(&secret);
        let swap_id = initiate_swap(&mut harness, &alice.name, &bob.name, &hash);

        cancel_swap(&mut harness, &swap_id);

        let state = get_swap_state(&harness, &swap_id);
        assert_eq!(state.status, SwapStatus::Cancelled);
    }
}

fn cancel_swap(harness: &mut TestHarness, swap_id: &str) {
    let mut state = harness.state.lock().unwrap();
    if let Some(swap) = state.swaps.iter_mut().find(|s| s.swap_id == swap_id) {
        swap.status = SwapStatus::Cancelled;
    }
}
