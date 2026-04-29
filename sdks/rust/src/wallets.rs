//! Wallet integration helpers — chain-agnostic adapter trait.

use async_trait::async_trait;
use serde::{Deserialize, Serialize};

use crate::error::Error;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WalletConnection {
    pub chain: String,
    pub address: String,
    pub public_key: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HtlcLockParams {
    pub receiver: String,
    pub amount: String,
    pub hash_lock: String,
    pub time_lock_seconds: u64,
    pub asset: Option<String>,
}

/// Minimal wallet surface — connect, address, sign.
#[async_trait]
pub trait WalletAdapter: Send + Sync {
    fn chain(&self) -> &str;
    async fn connect(&self) -> Result<WalletConnection, Error>;
    fn is_connected(&self) -> bool;
    async fn address(&self) -> Result<String, Error>;
    async fn sign_transaction(&self, raw_tx: &[u8]) -> Result<Vec<u8>, Error>;
    async fn disconnect(&self) -> Result<(), Error>;
}

/// HTLC-aware wallet adapter — lock, claim, refund.
#[async_trait]
pub trait HtlcWalletAdapter: WalletAdapter {
    async fn lock_htlc(&self, params: &HtlcLockParams) -> Result<String, Error>;
    async fn claim_htlc(&self, htlc_ref: &str, secret: &str) -> Result<String, Error>;
    async fn refund_htlc(&self, htlc_ref: &str) -> Result<String, Error>;
}

/// Stub adapter useful for tests / dry-runs.
#[derive(Debug, Clone)]
pub struct StubWallet {
    chain: String,
    addr: String,
}

impl StubWallet {
    pub fn new(chain: impl Into<String>, addr: impl Into<String>) -> Self {
        Self {
            chain: chain.into(),
            addr: addr.into(),
        }
    }
}

#[async_trait]
impl WalletAdapter for StubWallet {
    fn chain(&self) -> &str {
        &self.chain
    }
    async fn connect(&self) -> Result<WalletConnection, Error> {
        Ok(WalletConnection {
            chain: self.chain.clone(),
            address: self.addr.clone(),
            public_key: None,
        })
    }
    fn is_connected(&self) -> bool {
        true
    }
    async fn address(&self) -> Result<String, Error> {
        Ok(self.addr.clone())
    }
    async fn sign_transaction(&self, raw_tx: &[u8]) -> Result<Vec<u8>, Error> {
        Ok(raw_tx.to_vec())
    }
    async fn disconnect(&self) -> Result<(), Error> {
        Ok(())
    }
}

#[async_trait]
impl HtlcWalletAdapter for StubWallet {
    async fn lock_htlc(&self, params: &HtlcLockParams) -> Result<String, Error> {
        Ok(format!("stub-tx:{}", &params.hash_lock[..8.min(params.hash_lock.len())]))
    }
    async fn claim_htlc(&self, htlc_ref: &str, _secret: &str) -> Result<String, Error> {
        Ok(format!("stub-claim:{htlc_ref}"))
    }
    async fn refund_htlc(&self, htlc_ref: &str) -> Result<String, Error> {
        Ok(format!("stub-refund:{htlc_ref}"))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn stub_wallet_lifecycle() {
        let w = StubWallet::new("stellar", "GAFOO");
        assert_eq!(w.chain(), "stellar");
        assert!(w.is_connected());
        assert_eq!(w.address().await.unwrap(), "GAFOO");
        let tx = w
            .lock_htlc(&HtlcLockParams {
                receiver: "GBAR".into(),
                amount: "1".into(),
                hash_lock: "abcd1234".repeat(8),
                time_lock_seconds: 3600,
                asset: None,
            })
            .await
            .unwrap();
        assert!(tx.starts_with("stub-tx:"));
    }
}
