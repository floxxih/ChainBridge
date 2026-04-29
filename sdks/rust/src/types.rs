//! Wire types mirroring the ChainBridge API responses.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Supported chains. Keep in sync with the API's `Chain` enum.
#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "lowercase")]
pub enum Chain {
    Stellar,
    Bitcoin,
    Ethereum,
    Solana,
}

impl Chain {
    pub fn as_str(self) -> &'static str {
        match self {
            Chain::Stellar => "stellar",
            Chain::Bitcoin => "bitcoin",
            Chain::Ethereum => "ethereum",
            Chain::Solana => "solana",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiEnvelope<T> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<ApiError>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateOrderInput {
    pub from_chain: String,
    pub to_chain: String,
    pub from_asset: String,
    pub to_asset: String,
    pub from_amount: String,
    pub to_amount: String,
    pub sender_address: String,
    pub expiry: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Order {
    pub order_id: String,
    pub from_chain: String,
    pub to_chain: String,
    pub from_asset: String,
    pub to_asset: String,
    pub from_amount: String,
    pub to_amount: String,
    #[serde(default)]
    pub creator: Option<String>,
    pub status: String,
    #[serde(default, alias = "expires_at")]
    pub expiry: Option<String>,
    pub created_at: String,
    #[serde(default)]
    pub hash_lock: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct CreateHtlcInput {
    pub sender_address: String,
    pub receiver_address: String,
    pub amount: String,
    pub hash_lock: String,
    pub time_lock: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Htlc {
    pub htlc_id: String,
    #[serde(default, alias = "sender_address")]
    pub sender: Option<String>,
    #[serde(default, alias = "receiver_address")]
    pub receiver: Option<String>,
    pub amount: String,
    pub hash_lock: String,
    #[serde(alias = "expires_at")]
    pub time_lock: String,
    pub status: String,
    pub created_at: String,
    #[serde(default)]
    pub tx_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ClaimHtlcInput {
    pub secret: String,
    pub claimer_address: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct RefundHtlcInput {
    pub refunder_address: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Swap {
    pub swap_id: String,
    pub order_id: String,
    pub from_chain: String,
    pub to_chain: String,
    #[serde(default)]
    pub from_htlc_id: Option<String>,
    #[serde(default)]
    pub to_htlc_tx: Option<String>,
    pub status: String,
    pub created_at: String,
    #[serde(default)]
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeEstimate {
    pub chain: String,
    pub base_fee: u64,
    pub fee_unit: String,
    pub estimated_seconds: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FeeBreakdown {
    pub network_fees: HashMap<String, u64>,
    pub protocol_fee_bps: u32,
    pub total_fee_usd: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct FeeEstimateInput {
    pub from_chain: String,
    pub to_chain: String,
    pub from_amount: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Asset {
    pub id: String,
    pub chain: String,
    pub symbol: String,
    pub name: String,
    pub decimals: u32,
    pub is_verified: bool,
    pub is_active: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VolumeStats {
    pub total_volume: String,
    pub volume_by_chain: HashMap<String, String>,
    pub volume_by_asset: HashMap<String, String>,
    pub swap_count: u64,
    pub period: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SuccessRateStats {
    pub success_rate: f64,
    pub total_swaps: u64,
    pub successful_swaps: u64,
    pub failed_swaps: u64,
    pub expired_swaps: u64,
    pub period: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderListPage {
    pub orders: Vec<Order>,
    pub pagination: Pagination,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pagination {
    pub page: u32,
    pub limit: u32,
    pub total: u64,
    pub pages: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WsEvent {
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: serde_json::Value,
}
