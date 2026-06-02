//! Transaction retry mechanism with exponential backoff.
//!
//! Provides automatic retry for failed blockchain transactions,
//! with configurable backoff strategy and maximum retry limits.

use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::Mutex;
use tokio::time::{sleep, Duration};

/// Represents a transaction that can be retried.
#[derive(Clone, Debug)]
pub struct RetryableTransaction {
    pub id: String,
    pub chain: String,
    pub tx_data: Vec<u8>,
    pub attempt: u32,
    pub max_attempts: u32,
    pub next_retry_at: std::time::SystemTime,
}

/// Retry queue for managing failed transactions.
pub struct RetryQueue {
    queue: Arc<Mutex<HashMap<String, RetryableTransaction>>>,
}

impl RetryQueue {
    pub fn new() -> Self {
        Self {
            queue: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    /// Add a transaction to the retry queue.
    pub async fn enqueue(&self, tx: RetryableTransaction) {
        let mut queue = self.queue.lock().await;
        queue.insert(tx.id.clone(), tx);
    }

    /// Get current queue depth by chain.
    pub async fn depth_by_chain(&self) -> HashMap<String, usize> {
        let queue = self.queue.lock().await;
        let mut depth_map: HashMap<String, usize> = HashMap::new();
        
        for tx in queue.values() {
            *depth_map.entry(tx.chain.clone()).or_insert(0) += 1;
        }
        
        depth_map
    }

    /// Get the next transaction ready for retry.
    pub async fn dequeue_ready(&self) -> Option<RetryableTransaction> {
        let mut queue = self.queue.lock().await;
        let now = std::time::SystemTime::now();

        // Find a transaction ready for retry
        let ready_id = queue.iter()
            .find(|(_, tx)| tx.next_retry_at <= now)
            .map(|(id, _)| id.clone());

        if let Some(id) = ready_id {
            queue.remove(&id)
        } else {
            None
        }
    }

    /// Mark a transaction as failed and schedule next retry.
    ///
    /// Delay follows exponential backoff (2^attempt seconds) capped at `max_backoff_secs`
    /// so the queue cannot grow without bound on long-running retries.
    pub async fn retry_failed(&self, id: &str, max_attempts: u32, max_backoff_secs: u64) {
        let mut queue = self.queue.lock().await;
        if let Some(tx) = queue.get_mut(id) {
            tx.attempt += 1;
            if tx.attempt < max_attempts {
                // Exponential backoff capped at max_backoff_secs
                let delay_secs = 2u64.pow(tx.attempt).min(max_backoff_secs);
                tx.next_retry_at = std::time::SystemTime::now() + std::time::Duration::from_secs(delay_secs);
            } else {
                // Max attempts reached, remove from queue
                queue.remove(id);
            }
        }
    }

    /// Mark a transaction as successful and remove from queue.
    pub async fn mark_success(&self, id: &str) {
        let mut queue = self.queue.lock().await;
        queue.remove(id);
    }

    /// Get current queue status.
    pub async fn status(&self) -> HashMap<String, RetryableTransaction> {
        let queue = self.queue.lock().await;
        queue.clone()
    }
}

/// Retry processor that handles the retry loop.
pub struct RetryProcessor {
    queue: Arc<RetryQueue>,
    config: crate::config::RelayerConfig,
    metrics: crate::metrics::RelayerMetrics,
}

impl RetryProcessor {
    pub fn new(config: crate::config::RelayerConfig, metrics: crate::metrics::RelayerMetrics) -> Self {
        Self {
            queue: Arc::new(RetryQueue::new()),
            config,
            metrics,
        }
    }

    /// Start the retry processing loop.
    pub async fn run(&self) {
        loop {
            // Update queue depth metrics
            let depth_map = self.queue.depth_by_chain().await;
            for (chain, depth) in depth_map {
                self.metrics.update_retry_queue_depth(&chain, depth as i64);
            }

            if let Some(tx) = self.queue.dequeue_ready().await {
                self.metrics.mark_tx_submission(&tx.chain);
                let result = crate::submit::submit_transaction(&self.config, tx.clone()).await;
                match result {
                    Ok(_) => {
                        self.queue.mark_success(&tx.id).await;
                        println!("Transaction {} succeeded on attempt {}", tx.id, tx.attempt + 1);
                    }
                    Err(e) => {
                        self.metrics.mark_tx_error(&tx.chain);
                        println!("Transaction {} failed on attempt {}: {}", tx.id, tx.attempt + 1, e);

                        // Dead-letter unknown chains immediately instead of retrying.
                        if matches!(&e, crate::submit::SubmitError::UnsupportedChain(_)) {
                            println!(
                                "[Dead-letter] Transaction {} has unsupported chain '{}'; dropping",
                                tx.id, tx.chain
                            );
                            self.metrics.mark_tx_retry_failure(&tx.chain);
                            self.queue.mark_success(&tx.id).await;
                        } else {
                            self.queue.retry_failed(&tx.id, tx.max_attempts, self.config.max_retry_backoff_secs).await;
                            if tx.attempt + 1 >= tx.max_attempts {
                                self.metrics.mark_tx_retry_failure(&tx.chain);
                                // TODO: Send failure notification
                                println!("Transaction {} failed permanently after {} attempts", tx.id, tx.max_attempts);
                            } else {
                                self.metrics.mark_tx_retry(&tx.chain);
                            }
                        }
                    }
                }
            } else {
                // No transactions ready, sleep briefly
                sleep(Duration::from_secs(1)).await;
            }
        }
    }

    /// Get the retry queue for enqueuing transactions.
    pub fn queue(&self) -> &Arc<RetryQueue> {
        &self.queue
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_tx(id: &str, attempt: u32, max_attempts: u32) -> RetryableTransaction {
        RetryableTransaction {
            id: id.to_string(),
            chain: "stellar".into(),
            tx_data: vec![],
            attempt,
            max_attempts,
            next_retry_at: std::time::SystemTime::now(),
        }
    }

    #[tokio::test]
    async fn test_retry_backoff_is_capped() {
        let queue = RetryQueue::new();
        // attempt=10 would normally give 2^11 = 2048s after increment, well above any cap
        queue.enqueue(make_tx("tx-cap", 10, 20)).await;

        let cap = 60u64;
        queue.retry_failed("tx-cap", 20, cap).await;

        let status = queue.status().await;
        let updated = status.get("tx-cap").expect("tx should still be in queue");
        let delay = updated
            .next_retry_at
            .duration_since(std::time::SystemTime::now())
            .unwrap_or_default();
        assert!(
            delay.as_secs() <= cap,
            "backoff {}s exceeds cap {}s",
            delay.as_secs(),
            cap
        );
    }

    #[tokio::test]
    async fn test_retry_removed_at_max_attempts() {
        let queue = RetryQueue::new();
        queue.enqueue(make_tx("tx-exhaust", 4, 5)).await;

        queue.retry_failed("tx-exhaust", 5, 300).await;

        let status = queue.status().await;
        assert!(
            !status.contains_key("tx-exhaust"),
            "exhausted tx should be removed from queue"
        );
    }

    #[tokio::test]
    async fn test_mark_success_removes_tx() {
        let queue = RetryQueue::new();
        queue.enqueue(make_tx("tx-ok", 0, 5)).await;

        queue.mark_success("tx-ok").await;

        let status = queue.status().await;
        assert!(!status.contains_key("tx-ok"), "successful tx should be removed");
    }
}