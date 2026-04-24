/// Monitors the Stellar/Soroban network for ChainBridge HTLC and swap events.
///
/// Polls the Soroban RPC for contract events, detects new HTLCs and matched
/// orders, and triggers proof generation for counterparty chains.
use crate::config::RelayerConfig;
use crate::metrics::RelayerMetrics;
use std::time::Duration;
use tokio::time::sleep;

pub async fn monitor_loop(config: RelayerConfig, metrics: RelayerMetrics, retry_queue: std::sync::Arc<crate::retry::RetryQueue>) {
    println!(
        "[Stellar] Starting monitor - RPC: {}, contract: {}",
        config.stellar_rpc_url, config.contract_id
    );
    metrics.mark_started("stellar");

    let interval = Duration::from_secs(config.poll_interval_secs);
    let mut cursor: Option<String> = None;
    let mut latest_ledger = 0u64;

    loop {
        match poll_events(&config, &cursor, &retry_queue).await {
            Ok((new_cursor, event_count, max_ledger)) => {
                cursor = new_cursor;
                if max_ledger > latest_ledger {
                    latest_ledger = max_ledger;
                }
                metrics.mark_poll_success("stellar", latest_ledger, event_count as u64);
            }
            Err(e) => {
                eprintln!("[Stellar] Poll error: {}. Retrying...", e);
                metrics.mark_poll_error("stellar");
            }
        }
        sleep(interval).await;
    }
}

async fn poll_events(
    config: &RelayerConfig,
    cursor: &Option<String>,
    retry_queue: &std::sync::Arc<crate::retry::RetryQueue>,
) -> Result<(Option<String>, usize, u64), Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::new();

    let mut body = serde_json::json!({
        "jsonrpc": "2.0",
        "id": 1,
        "method": "getEvents",
        "params": {
            "startLedger": 0,
            "filters": [{
                "contractIds": [config.contract_id],
            }],
            "pagination": { "limit": 100 }
        }
    });

    if let Some(c) = cursor {
        body["params"]["pagination"]["cursor"] = serde_json::Value::String(c.clone());
    }

    let resp = client
        .post(&config.stellar_rpc_url)
        .json(&body)
        .send()
        .await?
        .json::<serde_json::Value>()
        .await?;

    let events = resp["result"]["events"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    let mut max_ledger = 0u64;
    for event in &events {
        let topics = event["topic"].as_array();
        if let Some(topics) = topics {
            let event_type = topics.first().and_then(|t| t.as_str()).unwrap_or("");
            println!("[Stellar] Event detected: {}", event_type);

            // Dispatch to proof generation and transaction submission
            match event_type {
                "htlc_created" => {
                    // Generate proof and submit to counterparty chain (e.g., Bitcoin)
                    let tx_id = format!("stellar-htlc-proof-{}", event["id"].as_str().unwrap_or("unknown"));
                    let tx = crate::retry::RetryableTransaction {
                        id: tx_id,
                        chain: "bitcoin".to_string(), // Assume counterparty is Bitcoin
                        tx_data: vec![], // TODO: Fill with actual proof data
                        attempt: 0,
                        max_attempts: config.max_retries,
                        next_retry_at: std::time::SystemTime::now(),
                    };
                    retry_queue.enqueue(tx).await;
                }
                "swap_matched" => {
                    // Create HTLC on counterparty chain
                    let tx_id = format!("stellar-swap-htlc-{}", event["id"].as_str().unwrap_or("unknown"));
                    let tx = crate::retry::RetryableTransaction {
                        id: tx_id,
                        chain: "bitcoin".to_string(), // Assume counterparty
                        tx_data: vec![], // TODO: Fill with HTLC data
                        attempt: 0,
                        max_attempts: config.max_retries,
                        next_retry_at: std::time::SystemTime::now(),
                    };
                    retry_queue.enqueue(tx).await;
                }
                _ => {}
            }
        }

        if let Some(ledger) = event["ledger"].as_u64() {
            if ledger > max_ledger {
                max_ledger = ledger;
            }
        }
    }

    let new_cursor = events
        .last()
        .and_then(|e| e["pagingToken"].as_str())
        .map(String::from);

    Ok((new_cursor, events.len(), max_ledger))
}
