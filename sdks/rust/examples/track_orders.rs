//! Subscribe to ChainBridge order events. Requires the `ws` feature:
//!     cargo run --example track_orders --features ws

#[cfg(feature = "ws")]
#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    use chainbridge_sdk::websocket::ChainBridgeWebSocket;

    let mut ws = ChainBridgeWebSocket::new("wss://api.chainbridge.io/ws");
    if let Ok(key) = std::env::var("CHAINBRIDGE_API_KEY") {
        ws = ws.with_api_key(key);
    }
    ws.subscribe("orders");

    ws.run(|event| {
        println!("{}: {}", event.event_type, event.data);
    })
    .await?;
    Ok(())
}

#[cfg(not(feature = "ws"))]
fn main() {
    eprintln!("Build with --features ws to enable the WebSocket example.");
}
