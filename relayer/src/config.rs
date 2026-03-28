use serde::Deserialize;

#[derive(Clone, Debug)]
pub struct RelayerConfig {
    pub relayer_name: String,
    pub relayer_fee_bps: u32,
    pub metrics_bind_addr: String,
    pub stellar_rpc_url: String,
    pub contract_id: String,
    pub bitcoin_rpc_url: String,
    pub ethereum_rpc_url: String,
    pub poll_interval_secs: u64,
    pub max_retries: u32,
}

impl RelayerConfig {
    pub fn from_env() -> Self {
        Self {
            relayer_name: std::env::var("RELAYER_NAME").unwrap_or_else(|_| "default".into()),
            relayer_fee_bps: std::env::var("RELAYER_FEE_BPS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(10),
            metrics_bind_addr: std::env::var("RELAYER_METRICS_BIND")
                .unwrap_or_else(|_| "0.0.0.0:9108".into()),
            stellar_rpc_url: std::env::var("SOROBAN_RPC_URL")
                .unwrap_or_else(|_| "https://soroban-testnet.stellar.org".into()),
            contract_id: std::env::var("CHAINBRIDGE_CONTRACT_ID").unwrap_or_default(),
            bitcoin_rpc_url: std::env::var("BITCOIN_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:8332".into()),
            ethereum_rpc_url: std::env::var("ETHEREUM_RPC_URL")
                .unwrap_or_else(|_| "http://localhost:8545".into()),
            poll_interval_secs: std::env::var("POLL_INTERVAL_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(15),
            max_retries: std::env::var("MAX_RETRIES")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(3),
        }
    }
}
