//! Optional WebSocket subscriber. Enable with the `ws` feature.

use std::collections::HashMap;
use std::sync::Arc;

use futures_util::{SinkExt, StreamExt};
use tokio::sync::Mutex;
use tokio_tungstenite::tungstenite::Message;

use crate::error::Error;
use crate::types::WsEvent;

#[derive(Debug, Clone)]
pub struct WsSubscription {
    pub channel: String,
    pub filters: Option<serde_json::Value>,
}

pub struct ChainBridgeWebSocket {
    url: String,
    headers: HashMap<String, String>,
    subscriptions: Vec<WsSubscription>,
}

impl ChainBridgeWebSocket {
    pub fn new(url: impl Into<String>) -> Self {
        Self {
            url: url.into(),
            headers: HashMap::new(),
            subscriptions: Vec::new(),
        }
    }

    pub fn with_api_key(mut self, key: impl Into<String>) -> Self {
        self.headers.insert("X-API-Key".into(), key.into());
        self
    }

    pub fn subscribe(&mut self, channel: impl Into<String>) {
        self.subscriptions.push(WsSubscription {
            channel: channel.into(),
            filters: None,
        });
    }

    pub fn subscribe_filtered(
        &mut self,
        channel: impl Into<String>,
        filters: serde_json::Value,
    ) {
        self.subscriptions.push(WsSubscription {
            channel: channel.into(),
            filters: Some(filters),
        });
    }

    /// Connect, send subscribe frames, and invoke `handler` for each event.
    /// Returns when the connection closes or a fatal error occurs.
    pub async fn run<F>(&self, handler: F) -> Result<(), Error>
    where
        F: Fn(WsEvent) + Send + Sync + 'static,
    {
        let (ws_stream, _) = tokio_tungstenite::connect_async(&self.url)
            .await
            .map_err(|e| Error::WebSocket(e.to_string()))?;

        let (write, mut read) = ws_stream.split();
        let write = Arc::new(Mutex::new(write));

        for sub in &self.subscriptions {
            let payload = serde_json::json!({
                "action": "subscribe",
                "channel": sub.channel,
                "filters": sub.filters,
            });
            write
                .lock()
                .await
                .send(Message::Text(payload.to_string()))
                .await
                .map_err(|e| Error::WebSocket(e.to_string()))?;
        }

        while let Some(msg) = read.next().await {
            let msg = msg.map_err(|e| Error::WebSocket(e.to_string()))?;
            if let Message::Text(text) = msg {
                if let Ok(event) = serde_json::from_str::<WsEvent>(&text) {
                    handler(event);
                }
            }
        }
        Ok(())
    }
}
