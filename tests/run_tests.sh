#!/bin/bash

set -e

echo "=== ChainBridge Integration Test Runner ==="
echo ""

echo "Running unit tests..."
cargo test --manifest-path tests/Cargo.toml --lib
echo "✓ Unit tests passed"
echo ""

echo "Running integration tests..."
cargo test --manifest-path tests/Cargo.toml --test '*'
echo "✓ Integration tests passed"
echo ""

echo "Running stress tests..."
cargo test --manifest-path tests/Cargo.toml -- stress --test-threads=1
echo "✓ Stress tests passed"
echo ""

echo "Running benchmarks..."
cargo bench --manifest-path tests/Cargo.toml --no-run
echo "✓ Benchmarks compiled"
echo ""

echo "=== All tests completed successfully ==="
