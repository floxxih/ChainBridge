/// Monitors the Ethereum network for HTLC contract events.
///
/// Polls for logs from the Ethereum HTLC contract, detects new
/// locks and claims, and generates Merkle proofs for submission
/// to the Stellar contract.
use crate::config::RelayerConfig;
use crate::metrics::RelayerMetrics;
use std::time::Duration;
use tokio::time::sleep;

pub async fn monitor_loop(config: RelayerConfig, metrics: RelayerMetrics) {
    println!("[Ethereum] Starting monitor - RPC: {}", config.ethereum_rpc_url);
    metrics.mark_started("ethereum");

    let interval = Duration::from_secs(config.poll_interval_secs);
    let mut last_block: u64 = 0;

    loop {
        match poll_logs(&config, last_block).await {
            Ok((new_block, detected_events)) => {
                if new_block > last_block {
                    println!("[Ethereum] Processed blocks {} -> {}", last_block, new_block);
                    last_block = new_block;
                }
                metrics.mark_poll_success("ethereum", new_block, detected_events as u64);
            }
            Err(e) => {
                eprintln!("[Ethereum] Poll error: {}. Retrying...", e);
                metrics.mark_poll_error("ethereum");
            }
        }
        sleep(interval).await;
    }
}

async fn poll_logs(
    config: &RelayerConfig,
    from_block: u64,
) -> Result<(u64, usize), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    // Get latest block number
    let resp = client
        .post(&config.ethereum_rpc_url)
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_blockNumber",
            "params": []
        }))
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let hex_block = resp["result"].as_str().unwrap_or("0x0");
    let current_block = u64::from_str_radix(hex_block.trim_start_matches("0x"), 16).unwrap_or(0);

    if current_block <= from_block {
        return Ok((from_block, 0));
    }

    // Get logs for HTLC contract events
    let logs_resp = client
        .post(&config.ethereum_rpc_url)
        .json(&serde_json::json!({
            "jsonrpc": "2.0",
            "id": 1,
            "method": "eth_getLogs",
            "params": [{
                "fromBlock": format!("0x{:x}", from_block + 1),
                "toBlock": format!("0x{:x}", current_block),
                // TODO: Filter by HTLC contract address
                // "address": config.ethereum_htlc_contract,
                // HTLC events: HTLCCreated, HTLCClaimed, HTLCRefunded
            }]
        }))
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let logs = logs_resp["result"].as_array().cloned().unwrap_or_default();

    for log in &logs {
        let topics = log["topics"].as_array();
        if let Some(topics) = topics {
            let event_sig = topics.first().and_then(|t| t.as_str()).unwrap_or("");
            println!("[Ethereum] Log detected: {}", &event_sig[..10.min(event_sig.len())]);

            // TODO: Decode event data, generate Merkle proof,
            // submit to Stellar ChainBridge contract via verify_proof()
        }
    }

    Ok((current_block, logs.len()))
}
