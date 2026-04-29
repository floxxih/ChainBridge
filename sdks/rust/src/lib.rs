//! Official Rust SDK for [ChainBridge](https://github.com/floxxih/ChainBridge).
//!
//! Provides a typed client for the ChainBridge REST API, plus crypto helpers
//! for HTLC secret/preimage management and (optionally) a WebSocket subscriber.
//!
//! ```no_run
//! use chainbridge_sdk::{ChainBridgeClient, ClientConfig};
//!
//! # async fn run() -> Result<(), chainbridge_sdk::Error> {
//! let client = ChainBridgeClient::new(ClientConfig {
//!     base_url: "https://api.chainbridge.io".into(),
//!     api_key: Some("cb_xxxxx".into()),
//!     ..Default::default()
//! })?;
//!
//! let fees = client.market().get_fee("stellar").await?;
//! println!("Stellar base fee: {} {}", fees.base_fee, fees.fee_unit);
//! # Ok(()) }
//! ```

pub mod client;
pub mod crypto;
pub mod error;
pub mod resources;
pub mod types;
pub mod wallets;

#[cfg(feature = "ws")]
pub mod websocket;

pub use client::{ChainBridgeClient, ClientConfig};
pub use error::Error;
pub use types::*;
