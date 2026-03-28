/// Monitors the Bitcoin network for HTLC transactions.
///
/// Polls the Bitcoin RPC for new blocks, scans transactions for
/// known HTLC script patterns, and generates SPV proofs for
/// submission to the Stellar contract.
use crate::config::RelayerConfig;
use crate::metrics::RelayerMetrics;
use std::time::Duration;
use tokio::time::sleep;

pub async fn monitor_loop(config: RelayerConfig, metrics: RelayerMetrics) {
    println!("[Bitcoin] Starting monitor - RPC: {}", config.bitcoin_rpc_url);
    metrics.mark_started("bitcoin");

    let interval = Duration::from_secs(config.poll_interval_secs);
    let mut last_block_height: u64 = 0;

    loop {
        match poll_blocks(&config, last_block_height).await {
            Ok((new_height, detected_events)) => {
                if new_height > last_block_height {
                    println!(
                        "[Bitcoin] Processed blocks {} -> {}",
                        last_block_height, new_height
                    );
                    last_block_height = new_height;
                }
                metrics.mark_poll_success("bitcoin", new_height, detected_events as u64);
            }
            Err(e) => {
                eprintln!("[Bitcoin] Poll error: {}. Retrying...", e);
                metrics.mark_poll_error("bitcoin");
            }
        }
        sleep(interval).await;
    }
}

async fn poll_blocks(
    config: &RelayerConfig,
    last_height: u64,
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
            let _txid = tx["txid"].as_str().unwrap_or("");
            detected_events += 0;
        }
    }

    Ok((current_height, detected_events))
}
