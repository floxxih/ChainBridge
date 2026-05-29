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
    pub async fn retry_failed(&self, id: &str, max_attempts: u32) {
        let mut queue = self.queue.lock().await;
        if let Some(tx) = queue.get_mut(id) {
            tx.attempt += 1;
            if tx.attempt < max_attempts {
                // Exponential backoff: 2^attempt seconds
                let delay_secs = 2u64.pow(tx.attempt);
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
                        self.queue.retry_failed(&tx.id, tx.max_attempts).await;
                        if tx.attempt + 1 >= tx.max_attempts {
                            self.metrics.mark_tx_retry_failure(&tx.chain);
                            // TODO: Send failure notification
                            println!("Transaction {} failed permanently after {} attempts", tx.id, tx.max_attempts);
                        } else {
                            self.metrics.mark_tx_retry(&tx.chain);
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

    fn ready_tx(id: &str) -> RetryableTransaction {
        RetryableTransaction {
            id: id.to_string(),
            chain: "bitcoin".to_string(),
            tx_data: vec![],
            attempt: 0,
            max_attempts: 3,
            next_retry_at: std::time::SystemTime::now()
                - std::time::Duration::from_secs(1),
        }
    }

    fn future_tx(id: &str) -> RetryableTransaction {
        RetryableTransaction {
            id: id.to_string(),
            chain: "ethereum".to_string(),
            tx_data: vec![],
            attempt: 0,
            max_attempts: 3,
            next_retry_at: std::time::SystemTime::now()
                + std::time::Duration::from_secs(60),
        }
    }

    #[tokio::test]
    async fn test_ready_transaction_dequeues() {
        let queue = RetryQueue::new();
        queue.enqueue(ready_tx("tx-ready")).await;
        let result = queue.dequeue_ready().await;
        assert!(result.is_some());
        assert_eq!(result.unwrap().id, "tx-ready");
    }

    #[tokio::test]
    async fn test_future_transaction_does_not_dequeue_early() {
        let queue = RetryQueue::new();
        queue.enqueue(future_tx("tx-future")).await;
        let result = queue.dequeue_ready().await;
        assert!(result.is_none(), "future transaction must not dequeue before its time");
    }

    #[tokio::test]
    async fn test_ready_dequeues_while_future_stays() {
        let queue = RetryQueue::new();
        queue.enqueue(ready_tx("tx-now")).await;
        queue.enqueue(future_tx("tx-later")).await;
        let dequeued = queue.dequeue_ready().await;
        assert!(dequeued.is_some());
        assert_eq!(dequeued.unwrap().id, "tx-now");
        // future tx still in queue
        let status = queue.status().await;
        assert!(status.contains_key("tx-later"));
    }

    #[tokio::test]
    async fn test_retry_failed_schedules_backoff_in_future() {
        let queue = RetryQueue::new();
        let mut tx = ready_tx("tx-retry");
        // re-enqueue as if it came back after a failed attempt
        tx.attempt = 0;
        queue.enqueue(tx).await;
        queue.retry_failed("tx-retry", 3).await;
        // after backoff rescheduling it should not be immediately ready
        let result = queue.dequeue_ready().await;
        assert!(result.is_none(), "retried tx should have a future next_retry_at");
    }

    #[tokio::test]
    async fn test_retry_failed_removes_when_max_attempts_reached() {
        let queue = RetryQueue::new();
        queue.enqueue(ready_tx("tx-exhaust")).await;
        // simulate exhausting all attempts
        queue.retry_failed("tx-exhaust", 1).await;
        let status = queue.status().await;
        assert!(!status.contains_key("tx-exhaust"), "exhausted tx must be removed");
    }

    #[tokio::test]
    async fn test_mark_success_removes_transaction() {
        let queue = RetryQueue::new();
        queue.enqueue(ready_tx("tx-ok")).await;
        queue.mark_success("tx-ok").await;
        let status = queue.status().await;
        assert!(!status.contains_key("tx-ok"));
    }
}