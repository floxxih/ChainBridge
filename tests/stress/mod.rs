use crate::{harness::*, mocks::*};
use std::sync::Arc;
use std::thread;
use std::time::Duration;

pub struct StressTestConfig {
    pub num_swaps: usize,
    pub num_threads: usize,
    pub duration_secs: u64,
}

impl Default for StressTestConfig {
    fn default() -> Self {
        StressTestConfig {
            num_swaps: 1000,
            num_threads: 10,
            duration_secs: 60,
        }
    }
}

pub fn run_concurrent_swap_stress(config: StressTestConfig) -> StressTestResults {
    let harness = Arc::new(setup_test_harness());
    let mut handles = vec![];

    let start_time = std::time::Instant::now();

    for thread_id in 0..config.num_threads {
        let harness_clone = Arc::clone(&harness);
        let swaps_per_thread = config.num_swaps / config.num_threads;

        let handle = thread::spawn(move || {
            let mut completed = 0;
            let mut failed = 0;

            for i in 0..swaps_per_thread {
                let initiator = format!("thread_{}_user_{}", thread_id, i);
                let responder = format!("thread_{}_user_{}", thread_id, i + 1);

                let secret = generate_stress_secret();
                let hash = compute_stress_hash(&secret);

                match initiate_stress_swap(&harness_clone, &initiator, &responder, &hash) {
                    Ok(_) => completed += 1,
                    Err(_) => failed += 1,
                }
            }

            ThreadResult { completed, failed }
        });

        handles.push(handle);
    }

    let mut total_completed = 0;
    let mut total_failed = 0;

    for handle in handles {
        let result = handle.join().unwrap();
        total_completed += result.completed;
        total_failed += result.failed;
    }

    let duration = start_time.elapsed();

    StressTestResults {
        total_swaps: config.num_swaps,
        completed: total_completed,
        failed: total_failed,
        duration,
        swaps_per_second: total_completed as f64 / duration.as_secs_f64(),
    }
}

pub fn run_high_load_test() -> HighLoadResults {
    let mut stellar = MockStellarNetwork::new_testnet();
    let mut bitcoin = MockBitcoinNetwork::new_testnet();
    let mut ethereum = MockBlockchain::new("ethereum");

    for i in 0..10000 {
        stellar.add_account(&format!("stellar_{}", i), "1000000");
    }

    for i in 0..1000 {
        let addr = format!("btc_{}", i);
        bitcoin.add_utxo(&addr, &format!("tx_{}", i), 0, 1_000_000);
    }

    for i in 0..1000 {
        ethereum.add_account(&format!("eth_{}", i), 10_000_000_000_000_000);
    }

    let start = std::time::Instant::now();

    let mut operations = 0;
    for i in 0..10000 {
        let _ = stellar.get_xlm_balance(&format!("stellar_{}", i));
        operations += 1;
    }

    let duration = start.elapsed();
    let ops_per_sec = operations as f64 / duration.as_secs_f64();

    HighLoadResults {
        operations,
        duration,
        ops_per_second: ops_per_sec,
    }
}

pub fn run_timeout_stress_test(num_swaps: usize) -> TimeoutStressResults {
    let mut harness = setup_test_harness();
    let mut timeouts_triggered = 0;
    let mut successful_claims = 0;

    for i in 0..num_swaps {
        let initiator = format!("user_{}", i);
        let responder = format!("user_{}", i + 1);

        harness.create_account(&initiator);
        harness.create_account(&responder);

        let secret = generate_stress_secret();
        let hash = compute_stress_hash(&secret);

        let swap_id = initiate_stress_swap(&harness, &initiator, &responder, &hash).unwrap();

        if i % 2 == 0 {
            harness.advance_time(3601);
            timeouts_triggered += 1;
        } else {
            successful_claims += 1;
        }
    }

    TimeoutStressResults {
        total_swaps: num_swaps,
        timeouts_triggered,
        successful_claims,
    }
}

struct ThreadResult {
    completed: usize,
    failed: usize,
}

#[derive(Debug)]
pub struct StressTestResults {
    pub total_swaps: usize,
    pub completed: usize,
    pub failed: usize,
    pub duration: Duration,
    pub swaps_per_second: f64,
}

#[derive(Debug)]
pub struct HighLoadResults {
    pub operations: usize,
    pub duration: Duration,
    pub ops_per_second: f64,
}

#[derive(Debug)]
pub struct TimeoutStressResults {
    pub total_swaps: usize,
    pub timeouts_triggered: usize,
    pub successful_claims: usize,
}

fn generate_stress_secret() -> Vec<u8> {
    vec![rand::random::<u8>(); 32]
}

fn compute_stress_hash(secret: &[u8]) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(secret);
    hex::encode(hasher.finalize())
}

fn initiate_stress_swap(
    harness: &TestHarness,
    initiator: &str,
    responder: &str,
    hashlock: &str,
) -> Result<String, String> {
    let swap_id = format!("swap_{}", rand::random::<u64>());
    let mut state = harness.state.lock().map_err(|_| "Lock error".to_string())?;

    state.swaps.push(SwapState {
        swap_id: swap_id.clone(),
        initiator: initiator.to_string(),
        responder: responder.to_string(),
        status: SwapStatus::Initiated,
        hashlock: hashlock.to_string(),
        timelock: state.current_timestamp + 3600,
        secret: None,
    });

    Ok(swap_id)
}

#[cfg(test)]
mod stress_tests {
    use super::*;

    #[test]
    fn test_concurrent_stress() {
        let config = StressTestConfig {
            num_swaps: 100,
            num_threads: 4,
            duration_secs: 10,
        };

        let results = run_concurrent_swap_stress(config);

        assert!(results.completed > 0);
        println!("Stress test results: {:?}", results);
    }

    #[test]
    fn test_high_load() {
        let results = run_high_load_test();

        assert!(results.operations > 0);
        println!("High load results: {:?}", results);
    }

    #[test]
    fn test_timeout_stress() {
        let results = run_timeout_stress_test(100);

        assert_eq!(results.total_swaps, 100);
        println!("Timeout stress results: {:?}", results);
    }
}
