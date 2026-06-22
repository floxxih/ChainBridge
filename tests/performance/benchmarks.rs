use crate::{harness::*, mocks::*};
use criterion::{criterion_group, criterion_main, BenchmarkId, Criterion};
use std::time::Duration;

fn swap_creation_benchmark(c: &mut Criterion) {
    let mut harness = setup_test_harness();
    let alice = harness.create_account("alice").clone();
    let bob = harness.create_account("bob").clone();

    c.bench_function("single_swap_creation", |b| {
        b.iter(|| {
            let secret = generate_bench_secret();
            let hash = compute_bench_hash(&secret);
            initiate_bench_swap(&mut harness, &alice.name, &bob.name, &hash);
        });
    });
}

fn multi_swap_benchmark(c: &mut Criterion) {
    let mut group = c.benchmark_group("multi_swaps");

    for size in [10, 50, 100, 500].iter() {
        group.bench_with_input(BenchmarkId::from_parameter(size), size, |b, &size| {
            let mut harness = setup_test_harness();

            for i in 0..size {
                harness.create_account(&format!("user_{}", i));
            }

            b.iter(|| {
                for i in 0..size {
                    let secret = generate_bench_secret();
                    let hash = compute_bench_hash(&secret);
                    let initiator = format!("user_{}", i);
                    let responder = format!("user_{}", (i + 1) % size);
                    initiate_bench_swap(&mut harness, &initiator, &responder, &hash);
                }
            });
        });
    }
    group.finish();
}

fn event_recording_benchmark(c: &mut Criterion) {
    let harness = setup_test_harness();

    c.bench_function("event_recording", |b| {
        b.iter(|| {
            let mut data = std::collections::HashMap::new();
            data.insert("swap_id".to_string(), "test_swap".to_string());
            data.insert("status".to_string(), "initiated".to_string());
            harness.record_event("contract".to_string(), "SwapInitiated".to_string(), data);
        });
    });
}

fn blockchain_query_benchmark(c: &mut Criterion) {
    let mut stellar = MockStellarNetwork::new_testnet();
    let mut bitcoin = MockBitcoinNetwork::new_testnet();

    for i in 0..1000 {
        stellar.add_account(&format!("account_{}", i), "1000");
    }

    for i in 0..100 {
        let addr = format!("btc_addr_{}", i);
        bitcoin.add_utxo(&addr, &format!("tx_{}", i), 0, 10000);
    }

    c.bench_function("stellar_balance_query", |b| {
        b.iter(|| {
            stellar.get_xlm_balance("account_500");
        });
    });

    c.bench_function("bitcoin_balance_query", |b| {
        b.iter(|| {
            bitcoin.get_balance("btc_addr_50");
        });
    });
}

criterion_group! {
    name = benches;
    config = Criterion::default()
        .measurement_time(Duration::from_secs(10))
        .sample_size(100);
    targets = swap_creation_benchmark, multi_swap_benchmark, event_recording_benchmark, blockchain_query_benchmark
}

criterion_main!(benches);

fn generate_bench_secret() -> Vec<u8> {
    vec![1u8; 32]
}

fn compute_bench_hash(secret: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(secret);
    hex::encode(hasher.finalize())
}

fn initiate_bench_swap(
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
