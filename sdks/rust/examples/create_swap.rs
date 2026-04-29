//! Create an XLM→BTC swap order with the Rust SDK.
//!
//! Run with:
//!     CHAINBRIDGE_API_KEY=cb_xxx CHAINBRIDGE_SENDER=GA... \
//!     cargo run --example create_swap

use chainbridge_sdk::{
    crypto::{derive_hash_lock, generate_secret_default},
    ChainBridgeClient, ClientConfig, CreateOrderInput, FeeEstimateInput,
};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let api_key = std::env::var("CHAINBRIDGE_API_KEY")?;
    let sender = std::env::var("CHAINBRIDGE_SENDER")?;
    let base = std::env::var("CHAINBRIDGE_API_URL")
        .unwrap_or_else(|_| "https://api.chainbridge.io".to_string());

    let client = ChainBridgeClient::new(ClientConfig {
        base_url: base,
        api_key: Some(api_key),
        ..Default::default()
    })?;

    let fees = client
        .market()
        .estimate_fees(&FeeEstimateInput {
            from_chain: "stellar".into(),
            to_chain: "bitcoin".into(),
            from_amount: "1000000000".into(),
        })
        .await?;
    println!("Estimated fees: total ${} ({} bps protocol)", fees.total_fee_usd, fees.protocol_fee_bps);

    let secret = generate_secret_default();
    let hash_lock = derive_hash_lock(&secret)?;
    let order = client
        .orders()
        .create(&CreateOrderInput {
            from_chain: "stellar".into(),
            to_chain: "bitcoin".into(),
            from_asset: "XLM".into(),
            to_asset: "BTC".into(),
            from_amount: "1000000000".into(),
            to_amount: "10000".into(),
            sender_address: sender,
            expiry: 86_400,
        })
        .await?;

    println!("Created order: {}", order.order_id);
    println!("Hash-lock (share with counterparty): {hash_lock}");
    eprintln!("Secret (KEEP PRIVATE until claim): {secret}");
    Ok(())
}
