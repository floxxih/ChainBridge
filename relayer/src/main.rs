//! ChainBridge Relayer Service
//!
//! Monitors Bitcoin, Ethereum, and Stellar networks for HTLC events,
//! generates cross-chain proofs, and submits them to complete atomic swaps.

use std::net::SocketAddr;

mod config;
mod metrics;
mod monitor;
mod proof;

#[tokio::main]
async fn main() {
    println!("ChainBridge Relayer v0.1.0");
    println!("Starting chain monitors...");

    let config = config::RelayerConfig::from_env();
    let metrics = metrics::RelayerMetrics::new(env!("CARGO_PKG_VERSION"));

    let metrics_addr: SocketAddr = config
        .metrics_bind_addr
        .parse()
        .unwrap_or_else(|_| "0.0.0.0:9108".parse().expect("valid metrics bind address"));

    let metrics_handle = tokio::spawn(metrics::serve(metrics.clone(), metrics_addr));
    println!("Relayer metrics available on http://{}/metrics", metrics_addr);

    // Spawn chain monitoring tasks
    let stellar_handle = tokio::spawn(monitor::stellar::monitor_loop(
        config.clone(),
        metrics.clone(),
    ));
    let bitcoin_handle = tokio::spawn(monitor::bitcoin::monitor_loop(
        config.clone(),
        metrics.clone(),
    ));
    let ethereum_handle = tokio::spawn(monitor::ethereum::monitor_loop(
        config.clone(),
        metrics.clone(),
    ));

    println!("Relayer running. Press Ctrl+C to stop.");

    // Wait for any monitor to exit (they shouldn't under normal operation)
    tokio::select! {
        r = metrics_handle => eprintln!("Metrics server exited: {:?}", r),
        r = stellar_handle => eprintln!("Stellar monitor exited: {:?}", r),
        r = bitcoin_handle => eprintln!("Bitcoin monitor exited: {:?}", r),
        r = ethereum_handle => eprintln!("Ethereum monitor exited: {:?}", r),
    }
}
