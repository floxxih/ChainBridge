//! Transaction submission to blockchain networks.
//!
//! Handles submitting proofs and HTLC transactions to Bitcoin, Ethereum, and Stellar.

use std::fmt;

use crate::config::RelayerConfig;
use crate::retry::RetryableTransaction;
use reqwest::Client;

/// Typed error returned by transaction submission functions.
#[derive(Debug)]
pub enum SubmitError {
    /// The requested chain is not supported by this relayer.
    UnsupportedChain(String),
    /// A network or RPC-level error occurred during submission.
    NetworkError(String),
    /// The network accepted the request but rejected the transaction.
    Rejected(String),
}

impl fmt::Display for SubmitError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SubmitError::UnsupportedChain(chain) => write!(f, "Unsupported chain: {}", chain),
            SubmitError::NetworkError(msg) => write!(f, "Network error: {}", msg),
            SubmitError::Rejected(reason) => write!(f, "Transaction rejected: {}", reason),
        }
    }
}

/// Submit a transaction to Bitcoin network.
pub async fn submit_bitcoin_tx(
    config: &RelayerConfig,
    tx: &RetryableTransaction,
) -> Result<(), SubmitError> {
    let _client = Client::new();

    // TODO: Implement actual Bitcoin transaction submission
    // This would involve creating and broadcasting a Bitcoin transaction
    // with the proof data

    println!("Submitting Bitcoin transaction: {}", tx.id);

    // Simulated failures are only injected when the test flag is set.
    if config.simulate_submission_failures && tx.attempt == 0 {
        println!(
            "[SIMULATED_FAILURE] Bitcoin transaction {} will fail (simulate_submission_failures=true)",
            tx.id
        );
        return Err(SubmitError::Rejected("Simulated Bitcoin submission failure".to_string()));
    }

    Ok(())
}

/// Submit a transaction to Ethereum network.
pub async fn submit_ethereum_tx(
    config: &RelayerConfig,
    tx: &RetryableTransaction,
) -> Result<(), SubmitError> {
    let _client = Client::new();

    // TODO: Implement actual Ethereum transaction submission
    // This would involve calling Ethereum RPC to send a transaction

    println!("Submitting Ethereum transaction: {}", tx.id);

    // Simulated failures are only injected when the test flag is set.
    if config.simulate_submission_failures && tx.attempt < 2 {
        println!(
            "[SIMULATED_FAILURE] Ethereum transaction {} will fail on attempt {} (simulate_submission_failures=true)",
            tx.id, tx.attempt
        );
        return Err(SubmitError::Rejected("Simulated Ethereum submission failure".to_string()));
    }

    Ok(())
}

/// Submit a transaction to Stellar network.
pub async fn submit_stellar_tx(
    config: &RelayerConfig,
    tx: &RetryableTransaction,
) -> Result<(), SubmitError> {
    let _client = Client::new();

    // TODO: Implement actual Stellar/Soroban transaction submission
    // This would involve invoking the Soroban contract

    println!("Submitting Stellar transaction: {}", tx.id);

    // Simulated failures are only injected when the test flag is set.
    if config.simulate_submission_failures && tx.attempt == 0 {
        println!(
            "[SIMULATED_FAILURE] Stellar transaction {} will fail (simulate_submission_failures=true)",
            tx.id
        );
        return Err(SubmitError::Rejected("Simulated Stellar submission failure".to_string()));
    }

    Ok(())
}

/// Generic submit function that dispatches based on chain.
pub async fn submit_transaction(
    config: &RelayerConfig,
    tx: RetryableTransaction,
) -> Result<(), SubmitError> {
    match tx.chain.as_str() {
        "bitcoin" => submit_bitcoin_tx(config, &tx).await,
        "ethereum" => submit_ethereum_tx(config, &tx).await,
        "stellar" => submit_stellar_tx(config, &tx).await,
        _ => Err(SubmitError::UnsupportedChain(tx.chain.clone())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::config::RelayerConfig;
    use crate::retry::RetryableTransaction;

    fn test_config() -> RelayerConfig {
        RelayerConfig {
            relayer_name: "test".into(),
            relayer_fee_bps: 10,
            metrics_bind_addr: "0.0.0.0:9108".into(),
            stellar_rpc_url: "https://soroban-testnet.stellar.org".into(),
            contract_id: "test_contract".into(),
            bitcoin_rpc_url: "http://localhost:8332".into(),
            ethereum_rpc_url: "http://localhost:8545".into(),
            poll_interval_secs: 15,
            max_retries: 3,
            stellar_start_ledger: 0,
            max_retry_backoff_secs: 300,
            cursor_path: None,
            simulate_submission_failures: true,
        }
    }

    fn test_tx(chain: &str, attempt: u32) -> RetryableTransaction {
        RetryableTransaction {
            id: "test-tx-001".into(),
            chain: chain.to_string(),
            tx_data: vec![],
            attempt,
            max_attempts: 10,
            next_retry_at: std::time::SystemTime::now(),
        }
    }

    #[tokio::test]
    async fn test_unsupported_chain_returns_typed_error() {
        let config = test_config();
        let tx = test_tx("solana", 0);
        let result = submit_transaction(&config, tx).await;
        assert!(
            matches!(result, Err(SubmitError::UnsupportedChain(ref c)) if c == "solana"),
            "expected UnsupportedChain(\"solana\"), got {:?}", result
        );
    }

    #[tokio::test]
    async fn test_unsupported_chain_display() {
        let err = SubmitError::UnsupportedChain("tron".into());
        assert_eq!(err.to_string(), "Unsupported chain: tron");
    }

    #[tokio::test]
    async fn test_rejected_display() {
        let err = SubmitError::Rejected("insufficient funds".into());
        assert_eq!(err.to_string(), "Transaction rejected: insufficient funds");
    }

    #[tokio::test]
    async fn test_bitcoin_routing_with_simulated_failures() {
        let config = test_config();
        let tx = test_tx("bitcoin", 0);
        let result = submit_transaction(&config, tx).await;
        // With simulate_submission_failures enabled, attempt 0 fails
        assert!(matches!(result, Err(SubmitError::Rejected(_))));
    }

    #[tokio::test]
    async fn test_ethereum_routing_with_simulated_failures() {
        let config = test_config();
        let tx = test_tx("ethereum", 0);
        let result = submit_transaction(&config, tx).await;
        assert!(matches!(result, Err(SubmitError::Rejected(_))));
    }

    #[tokio::test]
    async fn test_stellar_routing_with_simulated_failures() {
        let config = test_config();
        let tx = test_tx("stellar", 0);
        let result = submit_transaction(&config, tx).await;
        assert!(matches!(result, Err(SubmitError::Rejected(_))));
    }

    #[tokio::test]
    async fn test_normal_runtime_does_not_simulate_failures() {
        let mut config = test_config();
        config.simulate_submission_failures = false;
        for chain in &["bitcoin", "ethereum", "stellar"] {
            let tx = test_tx(chain, 0);
            let result = submit_transaction(&config, tx).await;
            assert!(
                result.is_ok(),
                "expected Ok for {} without simulate flag, got {:?}",
                chain,
                result
            );
        }
    }

    #[tokio::test]
    async fn test_retry_with_simulated_failures_eventually_succeeds() {
        let config = test_config(); // simulate_submission_failures = true
        // Bitcoin succeeds on attempt >= 1
        let tx = test_tx("bitcoin", 1);
        let result = submit_transaction(&config, tx).await;
        assert!(result.is_ok(), "bitcoin attempt 1 should succeed: {:?}", result);

        // Ethereum succeeds on attempt >= 2
        let tx = test_tx("ethereum", 2);
        let result = submit_transaction(&config, tx).await;
        assert!(result.is_ok(), "ethereum attempt 2 should succeed: {:?}", result);

        // Stellar succeeds on attempt >= 1
        let tx = test_tx("stellar", 1);
        let result = submit_transaction(&config, tx).await;
        assert!(result.is_ok(), "stellar attempt 1 should succeed: {:?}", result);
    }
}
