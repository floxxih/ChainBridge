//! ChainBridge Relayer Service
//!
//! Monitors Bitcoin, Ethereum, and Stellar networks for HTLC events,
//! generates cross-chain proofs, and submits them to complete atomic swaps.

use std::net::SocketAddr;
use tokio::sync::broadcast;

mod config;
mod metrics;
mod monitor;
mod proof;
mod retry;
mod submit;

#[tokio::main]
async fn main() {
    println!("ChainBridge Relayer v0.1.0");
    println!("Starting chain monitors...");

    let config = config::RelayerConfig::from_env();
    let metrics = metrics::RelayerMetrics::new(env!("CARGO_PKG_VERSION"));

    let metrics_addr: SocketAddr = config.metrics_bind_addr.parse().expect("config already validated");

    let metrics_handle = tokio::spawn(metrics::serve(metrics.clone(), metrics_addr));
    println!("Relayer metrics available on http://{}/metrics", metrics_addr);

    let retry_processor = retry::RetryProcessor::new(config.clone(), metrics.clone());
    let retry_queue = retry_processor.queue().clone();

    let (shutdown_tx, _) = broadcast::channel(1);

    // Spawn chain monitoring tasks
    let stellar_handle = tokio::spawn(monitor::stellar::monitor_loop(
        config.clone(),
        metrics.clone(),
        retry_queue.clone(),
    ));
    let bitcoin_handle = tokio::spawn(monitor::bitcoin::monitor_loop(
        config.clone(),
        metrics.clone(),
        retry_queue.clone(),
    ));
    let ethereum_handle = tokio::spawn(monitor::ethereum::monitor_loop(
        config.clone(),
        metrics.clone(),
        retry_queue.clone(),
    ));

    let retry_handle = tokio::spawn(async move {
        retry_processor.run().await;
    });
    println!("Transaction retry processor started");

    println!("Relayer running. Press Ctrl+C to stop.");

    let shutdown_signal = async {
        tokio::signal::ctrl_c().await.ok();
    };

    tokio::select! {
        _ = shutdown_signal => {
            println!("Shutdown signal received (Ctrl+C)");
            let _ = shutdown_tx.send(());
            abort_tasks(&[&metrics_handle, &stellar_handle, &bitcoin_handle, &ethereum_handle, &retry_handle]).await;
            println!("Relayer shutdown complete");
        }
        r = metrics_handle => eprintln!("Metrics server exited: {:?}", r),
        r = stellar_handle => eprintln!("Stellar monitor exited: {:?}", r),
        r = bitcoin_handle => eprintln!("Bitcoin monitor exited: {:?}", r),
        r = ethereum_handle => eprintln!("Ethereum monitor exited: {:?}", r),
        r = retry_handle => eprintln!("Retry processor exited: {:?}", r),
    }
}

async fn abort_tasks(handles: &[&tokio::task::JoinHandle<()>]) {
    for handle in handles {
        handle.abort();
    }
    tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
}
