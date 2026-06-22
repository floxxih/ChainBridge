# Integration Testing Framework

This document describes the integration testing framework for ChainBridge, designed to ensure the reliability and correctness of cross-chain atomic swaps.

## Overview

The testing framework provides:
- End-to-end swap flow testing
- Mock blockchain environments (Stellar, Ethereum, Bitcoin)
- Performance benchmarks
- Stress testing scenarios
- Multi-party interaction tests

## Test Structure

```
tests/
├── Cargo.toml              # Test dependencies
├── lib.rs                  # Test library entry point
├── harness/
│   └── mod.rs              # Test harness and utilities
├── mocks/
│   └── mod.rs              # Mock blockchain implementations
├── integration/
│   ├── mod.rs
│   └── swap_flows.rs       # Swap flow integration tests
├── performance/
│   ├── mod.rs
│   └── benchmarks.rs       # Performance benchmarks
└── stress/
    └── mod.rs              # Stress testing scenarios
```

## Test Harness

### Setup

```rust
use crate::harness::*;

let harness = setup_test_harness();
```

### Creating Test Accounts

```rust
let alice = harness.create_account("alice");
let bob = harness.create_account("bob");
```

### Time Manipulation

```rust
// Advance time by 1 hour
harness.advance_time(3600);

// Get current timestamp
let timestamp = harness.get_current_timestamp();
```

### Event Recording

```rust
let mut data = HashMap::new();
data.insert("swap_id".to_string(), "swap_123".to_string());
harness.record_event("contract".to_string(), "SwapInitiated".to_string(), data);
```

## Mock Blockchains

### Stellar (Testnet/Mainnet)

```rust
let mut stellar = MockStellarNetwork::new_testnet();

// Add account with XLM balance
stellar.add_account("GABC...", "1000");

// Query balance
let balance = stellar.get_xlm_balance("GABC...");
```

### Ethereum

```rust
let mut ethereum = MockBlockchain::new("ethereum");

// Add account with ETH balance (in wei)
ethereum.add_account("0x123...", 10_000_000);

// Transfer ETH
let tx_hash = ethereum.transfer("0x123...", "0x456...", 1_000_000)?;
```

### Bitcoin (Testnet/Mainnet)

```rust
let mut bitcoin = MockBitcoinNetwork::new_testnet();

// Add UTXO
bitcoin.add_utxo("bc1q...", "tx123", 0, 50000);

// Query balance (in satoshis)
let balance = bitcoin.get_balance("bc1q...");
```

## Integration Tests

### Running Tests

```bash
# Run all integration tests
cargo test --manifest-path tests/Cargo.toml

# Run specific test
cargo test --manifest-path tests/Cargo.toml test_complete_atomic_swap_flow

# Run with verbose output
cargo test --manifest-path tests/Cargo.toml -- --nocapture
```

### Test Categories

#### Swap Flow Tests
- Complete atomic swap execution
- HTLC claim with secret
- HTLC timeout and refund
- Multi-chain swap initiation

#### Multi-Party Tests
- Concurrent swap operations
- Swap cancellation flows
- Multiple participant interactions

### Example Test

```rust
#[test]
fn test_complete_atomic_swap_flow() {
    let mut harness = setup_test_harness();
    
    let alice = harness.create_account("alice").clone();
    let bob = harness.create_account("bob").clone();

    // Generate secret and hashlock
    let secret = generate_secret();
    let hashlock = compute_hashlock(&secret);

    // Initiate swap
    let swap_id = initiate_swap(&mut harness, &alice.name, &bob.name, &hashlock);

    // Verify swap state
    let state = get_swap_state(&harness, &swap_id);
    assert_eq!(state.status, SwapStatus::Initiated);
}
```

## Performance Benchmarks

### Running Benchmarks

```bash
# Run all benchmarks
cargo bench --manifest-path tests/Cargo.toml

# Run specific benchmark
cargo bench --manifest-path tests/Cargo.toml swap_creation_benchmark
```

### Available Benchmarks

| Benchmark | Description |
|-----------|-------------|
| `single_swap_creation` | Time to create a single swap |
| `multi_swaps` | Concurrent swap creation (10, 50, 100, 500) |
| `event_recording` | Event recording performance |
| `stellar_balance_query` | Stellar balance query speed |
| `bitcoin_balance_query` | Bitcoin balance query speed |

### Interpreting Results

Benchmarks use Criterion, which provides:
- Mean execution time
- Standard deviation
- Outlier detection
- Performance regression detection

## Stress Testing

### Running Stress Tests

```bash
# Run all stress tests
cargo test --manifest-path tests/Cargo.toml --test stress -- --test-threads=1

# Run specific stress test
cargo test --manifest-path tests/Cargo.toml test_concurrent_stress
```

### Stress Test Types

#### Concurrent Swap Stress

Tests swap creation under concurrent load:
- Configurable number of swaps and threads
- Measures throughput (swaps/second)
- Reports success/failure rates

```rust
let config = StressTestConfig {
    num_swaps: 1000,
    num_threads: 10,
    duration_secs: 60,
};
let results = run_concurrent_swap_stress(config);
```

#### High Load Test

Tests system performance under high query load:
- 10,000+ account queries
- Multi-chain balance checks
- Measures operations per second

```rust
let results = run_high_load_test();
```

#### Timeout Stress Test

Tests HTLC timeout handling under load:
- Configurable number of swaps
- Tests timeout triggering
- Verifies refund logic

```rust
let results = run_timeout_stress_test(100);
```

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/test.yml`:

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Rust
        uses: actions-rs/toolchain@v1
        with:
          toolchain: stable
          
      - name: Run integration tests
        run: cargo test --manifest-path tests/Cargo.toml --verbose
        
      - name: Run benchmarks
        run: cargo bench --manifest-path tests/Cargo.toml --no-run
        
      - name: Run stress tests
        run: cargo test --manifest-path tests/Cargo.toml -- stress --test-threads=1
```

## Test Data Generation

### Secrets and Hashes

```rust
// Generate random 32-byte secret
let secret = generate_secret();

// Compute SHA-256 hash
let hash = compute_hash(&secret);

// Create hex-encoded hashlock
let hashlock = compute_hashlock(&secret);

// Verify secret matches hash
assert!(verify_secret(&secret, &hash));
```

### Mock Account Creation

```rust
// Create test accounts with balances
for i in 0..100 {
    let account_id = format!("user_{}", i);
    harness.create_account(&account_id);
}
```

## Debugging Tests

### Enable Logging

```bash
RUST_LOG=debug cargo test --manifest-path tests/Cargo.toml -- --nocapture
```

### Inspect Test State

```rust
// Get all events
let events = harness.get_events();

// Check swap state
let state = get_swap_state(&harness, &swap_id);
println!("Swap status: {:?}", state.status);
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Lock contention | Reduce thread count or increase timeouts |
| Balance underflow | Ensure accounts have sufficient balance |
| Timeout not triggering | Check `advance_time()` was called |

## Performance Baselines

Established baselines for ChainBridge operations:

| Operation | Target Time |
|-----------|-------------|
| Swap creation | < 10ms |
| Swap claim | < 5ms |
| Balance query | < 1ms |
| Event recording | < 1ms |
| 1000 concurrent swaps | < 5s |

## Extending Tests

### Adding New Integration Tests

1. Create test file in `tests/integration/`
2. Add module to `tests/integration/mod.rs`
3. Implement test function with `#[test]` attribute
4. Run tests to verify

### Adding New Benchmarks

1. Add benchmark function in `tests/performance/benchmarks.rs`
2. Register in `criterion_group!` macro
3. Run benchmarks to verify

### Adding New Stress Tests

1. Add stress test in `tests/stress/mod.rs`
2. Implement test function with `#[test]` attribute
3. Configure stress parameters
4. Run tests to verify

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Reset state between tests
3. **Determinism**: Use fixed seeds for reproducible tests
4. **Coverage**: Test all swap states and transitions
5. **Performance**: Monitor test execution time
6. **Documentation**: Document test purpose and expected behavior

## Troubleshooting

### Tests Hang

- Check for deadlock conditions
- Reduce concurrent operations
- Add timeouts to operations

### Tests Fail Intermittently

- Check for race conditions
- Increase test timeouts
- Use deterministic test data

### Memory Issues

- Reduce number of concurrent operations
- Clear state between iterations
- Use `--test-threads=1` for resource constraints

## Contributing

When adding new features:
1. Write integration tests for new functionality
2. Add performance benchmarks if applicable
3. Update this documentation
4. Ensure CI passes before merging
