/// Monitors the Bitcoin network for HTLC transactions.
///
/// Polls the Bitcoin RPC for new blocks, scans transactions for
/// known HTLC script patterns, and generates SPV proofs for
/// submission to the Stellar contract.
use crate::config::RelayerConfig;
use crate::metrics::RelayerMetrics;
use std::time::Duration;
use tokio::time::sleep;

/// Errors that can occur during Bitcoin chain monitoring.
#[derive(Debug, Clone, PartialEq)]
pub enum BitcoinMonitorError {
    /// The Bitcoin RPC endpoint is unreachable or returned an HTTP error.
    RpcUnreachable(String),
    /// A response from the Bitcoin RPC could not be parsed into the expected shape.
    ParseFailure(String),
    /// No new blocks or events were detected since the last poll.
    NoNewEvents,
}

impl std::fmt::Display for BitcoinMonitorError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            BitcoinMonitorError::RpcUnreachable(msg) => {
                write!(f, "Bitcoin RPC unreachable: {}", msg)
            }
            BitcoinMonitorError::ParseFailure(msg) => {
                write!(f, "Bitcoin RPC parse failure: {}", msg)
            }
            BitcoinMonitorError::NoNewEvents => {
                write!(f, "No new Bitcoin blocks or events detected")
            }
        }
    }
}

impl std::error::Error for BitcoinMonitorError {}

/// Classify a generic error from the Bitcoin monitor poll into a
/// `BitcoinMonitorError` variant.
///
/// Returns `BitcoinMonitorError::RpcUnreachable` for connection/transport
/// errors, `BitcoinMonitorError::ParseFailure` for serde or shape errors,
/// and `None` for other generic errors that do not match known patterns.
pub fn classify_error(err: &(dyn std::error::Error + Send + Sync)) -> Option<BitcoinMonitorError> {
    let err_str = err.to_string().to_lowercase();

    if err_str.contains("connect")
        || err_str.contains("refused")
        || err_str.contains("timed")
        || err_str.contains("timeout")
        || err_str.contains("dns")
        || err_str.contains("resolve")
        || err_str.contains("eof")
    {
        return Some(BitcoinMonitorError::RpcUnreachable(err.to_string()));
    }

    if err_str.contains("parse")
        || err_str.contains("expected")
        || err_str.contains("invalid")
        || err_str.contains("unwrap")
        || err_str.contains("serde")
        || err_str.contains("json")
    {
        return Some(BitcoinMonitorError::ParseFailure(err.to_string()));
    }

    None
}

pub async fn monitor_loop(config: RelayerConfig, metrics: RelayerMetrics, retry_queue: std::sync::Arc<crate::retry::RetryQueue>) {
    println!("[Bitcoin] Starting monitor - RPC: {}", config.bitcoin_rpc_url);
    metrics.mark_started("bitcoin");

    let interval = Duration::from_secs(config.poll_interval_secs);
    let mut last_block_height: u64 = 0;

    loop {
        match poll_blocks(&config, last_block_height, &retry_queue).await {
            Ok((new_height, detected_events)) => {
                if new_height > last_block_height {
                    println!(
                        "[Bitcoin] Processed blocks {} -> {}",
                        last_block_height, new_height
                    );
                    last_block_height = new_height;
                } else if detected_events == 0 {
                    // No new blocks or events — classify as NoNewEvents
                    let classified = BitcoinMonitorError::NoNewEvents;
                    println!("[Bitcoin] {}", classified);
                }
                metrics.mark_poll_success("bitcoin", new_height, detected_events as u64);
            }
            Err(e) => {
                let classified = classify_error(&*e).unwrap_or_else(|| {
                    BitcoinMonitorError::RpcUnreachable(e.to_string())
                });
                eprintln!("[Bitcoin] Poll error ({}): {}", classified, e);
                metrics.mark_poll_error("bitcoin");
            }
        }
        sleep(interval).await;
    }
}

async fn poll_blocks(
    config: &RelayerConfig,
    last_height: u64,
    retry_queue: &std::sync::Arc<crate::retry::RetryQueue>,
) -> Result<(u64, usize), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    // Get current block count
    let resp = client
        .post(&config.bitcoin_rpc_url)
        .json(&serde_json::json!({
            "jsonrpc": "1.0",
            "id": "relayer",
            "method": "getblockcount",
            "params": []
        }))
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let current_height = resp["result"].as_u64().unwrap_or(last_height);

    // Scan new blocks for HTLC transactions
    let mut detected_events = 0usize;
    for height in (last_height + 1)..=current_height {
        // Get block hash
        let hash_resp = client
            .post(&config.bitcoin_rpc_url)
            .json(&serde_json::json!({
                "jsonrpc": "1.0",
                "id": "relayer",
                "method": "getblockhash",
                "params": [height]
            }))
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let block_hash = hash_resp["result"].as_str().unwrap_or("");

        // Get block with transactions
        let block_resp = client
            .post(&config.bitcoin_rpc_url)
            .json(&serde_json::json!({
                "jsonrpc": "1.0",
                "id": "relayer",
                "method": "getblock",
                "params": [block_hash, 2]
            }))
            .send()
            .await?
            .json::<serde_json::Value>()
            .await?;

        let txs = block_resp["result"]["tx"]
            .as_array()
            .cloned()
            .unwrap_or_default();

        for tx in &txs {
            // TODO: Check transaction scripts for HTLC patterns
            // (OP_SHA256 <hash> OP_EQUALVERIFY or OP_HASH256 <hash> OP_EQUAL)
            // When found, generate SPV proof and submit to Stellar contract
            let txid = tx["txid"].as_str().unwrap_or("");
            // Simulate HTLC detection
            if txid.starts_with("a") { // Dummy condition
                println!("[Bitcoin] HTLC detected: {} -> routing to stellar", txid);
                let proof_tx = crate::retry::RetryableTransaction {
                    id: format!("bitcoin-proof-{}", txid),
                    chain: "stellar".to_string(),
                    tx_data: vec![], // TODO: Fill with SPV proof
                    attempt: 0,
                    max_attempts: config.max_retries,
                    next_retry_at: std::time::SystemTime::now(),
                };
                retry_queue.enqueue(proof_tx).await;
                detected_events += 1;
            }
        }
    }

    Ok((current_height, detected_events))
}

#[cfg(test)]
mod tests {
    use super::*;

    // -------------------------------------------------------------------------
    // BitcoinMonitorError display tests
    // -------------------------------------------------------------------------

    #[test]
    fn test_display_rpc_unreachable() {
        let err = BitcoinMonitorError::RpcUnreachable("connection refused".into());
        assert_eq!(format!("{}", err), "Bitcoin RPC unreachable: connection refused");
    }

    #[test]
    fn test_display_parse_failure() {
        let err = BitcoinMonitorError::ParseFailure("expected value at line 1".into());
        assert_eq!(
            format!("{}", err),
            "Bitcoin RPC parse failure: expected value at line 1"
        );
    }

    #[test]
    fn test_display_no_new_events() {
        let err = BitcoinMonitorError::NoNewEvents;
        assert_eq!(format!("{}", err), "No new Bitcoin blocks or events detected");
    }

    // -------------------------------------------------------------------------
    // classify_error — RPC unreachable patterns
    // -------------------------------------------------------------------------

    #[test]
    fn test_classify_connect_refused() {
        let err = std::io::Error::new(std::io::ErrorKind::ConnectionRefused, "connection refused");
        let result = classify_error(&err);
        assert_eq!(result, Some(BitcoinMonitorError::RpcUnreachable("connection refused".into())));
    }

    #[test]
    fn test_classify_timeout() {
        let err = std::io::Error::new(std::io::ErrorKind::TimedOut, "timed out");
        let result = classify_error(&err);
        assert_eq!(result, Some(BitcoinMonitorError::RpcUnreachable("timed out".into())));
    }

    #[test]
    fn test_classify_dns_resolve() {
        let err = std::io::Error::new(std::io::ErrorKind::NotFound, "failed to resolve host");
        let result = classify_error(&err);
        assert_eq!(result, Some(BitcoinMonitorError::RpcUnreachable("failed to resolve host".into())));
    }

    #[test]
    fn test_classify_eof() {
        let err = std::io::Error::new(std::io::ErrorKind::UnexpectedEof, "unexpected eof");
        let result = classify_error(&err);
        assert_eq!(result, Some(BitcoinMonitorError::RpcUnreachable("unexpected eof".into())));
    }

    // -------------------------------------------------------------------------
    // classify_error — parse failure patterns
    // -------------------------------------------------------------------------

    #[test]
    fn test_classify_parse_error() {
        let err = <serde_json::Error as serde::de::Error>::custom("expected value at line 1 column 2");
        let result = classify_error(&err);
        assert_eq!(
            result,
            Some(BitcoinMonitorError::ParseFailure("expected value at line 1 column 2".into()))
        );
    }

    #[test]
    fn test_classify_invalid_data() {
        let err = std::io::Error::new(std::io::ErrorKind::InvalidData, "invalid UTF-8 data");
        let result = classify_error(&err);
        assert_eq!(
            result,
            Some(BitcoinMonitorError::ParseFailure("invalid UTF-8 data".into()))
        );
    }

    // -------------------------------------------------------------------------
    // classify_error — unknown error (should return None)
    // -------------------------------------------------------------------------

    #[test]
    fn test_classify_unknown_error() {
        // An error whose message does not match any known pattern
        struct CustomErr;
        impl std::fmt::Display for CustomErr {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "some random error")
            }
        }
        impl std::fmt::Debug for CustomErr {
            fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
                write!(f, "CustomErr")
            }
        }
        impl std::error::Error for CustomErr {}

        let result = classify_error(&CustomErr);
        assert_eq!(result, None);
    }
}
