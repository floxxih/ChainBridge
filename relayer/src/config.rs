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
    /// Initial Soroban ledger sequence for Stellar event polling when no cursor is saved.
    /// Set to 0 (default) to start from genesis, or to the current ledger to skip history.
    pub stellar_start_ledger: u64,
    /// Maximum exponential backoff delay in seconds between transaction retries.
    /// The backoff sequence (2, 4, 8, …) is capped at this value. Default: 300.
    pub max_retry_backoff_secs: u64,
    /// Optional file path for persisting the Stellar event cursor across restarts.
    pub cursor_path: Option<String>,
    /// When true, transaction submission functions deliberately inject
    /// transient failures so that the retry machinery can be exercised
    /// during development or in CI.  **Must be false in production.**
    pub simulate_submission_failures: bool,
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
            stellar_start_ledger: std::env::var("STELLAR_START_LEDGER")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(0),
            max_retry_backoff_secs: std::env::var("MAX_RETRY_BACKOFF_SECS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(300),
            cursor_path: std::env::var("CURSOR_PATH").ok(),
            simulate_submission_failures: std::env::var("SIMULATE_SUBMISSION_FAILURES")
                .ok()
                .map(|v| v == "1" || v.eq_ignore_ascii_case("true"))
                .unwrap_or(false),
        }
    }
}
