//! HTTP client and top-level [`ChainBridgeClient`].

use std::sync::Arc;
use std::time::Duration;

use reqwest::header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE};
use reqwest::{Method, StatusCode};
use serde::de::DeserializeOwned;
use serde::Serialize;
use serde_json::Value;
use url::Url;

use crate::error::Error;
use crate::resources::{
    AnalyticsResource, AssetsResource, AuthResource, HtlcsResource, MarketResource,
    OrdersResource, ProofsResource, SwapsResource,
};
use crate::types::{ApiEnvelope, ApiError};

const DEFAULT_BASE_URL: &str = "https://api.chainbridge.io";
const USER_AGENT: &str = concat!("chainbridge-sdk-rust/", env!("CARGO_PKG_VERSION"));

/// Configuration for [`ChainBridgeClient`].
#[derive(Debug, Clone)]
pub struct ClientConfig {
    pub base_url: String,
    pub api_key: Option<String>,
    pub bearer_token: Option<String>,
    pub timeout: Duration,
    pub max_retries: u32,
    pub backoff: Duration,
}

impl Default for ClientConfig {
    fn default() -> Self {
        Self {
            base_url: DEFAULT_BASE_URL.into(),
            api_key: None,
            bearer_token: None,
            timeout: Duration::from_secs(30),
            max_retries: 3,
            backoff: Duration::from_millis(500),
        }
    }
}

#[derive(Debug, Clone)]
pub(crate) struct HttpClient {
    pub(crate) base_url: Url,
    pub(crate) inner: reqwest::Client,
    pub(crate) max_retries: u32,
    pub(crate) backoff: Duration,
}

impl HttpClient {
    fn new(cfg: &ClientConfig) -> Result<Self, Error> {
        let base = Url::parse(&cfg.base_url)?;
        let mut headers = HeaderMap::new();
        headers.insert(CONTENT_TYPE, HeaderValue::from_static("application/json"));
        headers.insert(
            reqwest::header::ACCEPT,
            HeaderValue::from_static("application/json"),
        );
        headers.insert(
            reqwest::header::USER_AGENT,
            HeaderValue::from_static(USER_AGENT),
        );
        if let Some(key) = &cfg.api_key {
            headers.insert(
                "X-API-Key",
                HeaderValue::from_str(key).map_err(|e| Error::Config(e.to_string()))?,
            );
        }
        if let Some(token) = &cfg.bearer_token {
            headers.insert(
                AUTHORIZATION,
                HeaderValue::from_str(&format!("Bearer {token}"))
                    .map_err(|e| Error::Config(e.to_string()))?,
            );
        }
        let inner = reqwest::Client::builder()
            .default_headers(headers)
            .timeout(cfg.timeout)
            .build()
            .map_err(|e| Error::Config(e.to_string()))?;

        Ok(Self {
            base_url: base,
            inner,
            max_retries: cfg.max_retries.max(1),
            backoff: cfg.backoff,
        })
    }

    pub(crate) async fn request<B: Serialize, R: DeserializeOwned>(
        &self,
        method: Method,
        path: &str,
        body: Option<&B>,
        query: Option<&[(&str, String)]>,
    ) -> Result<R, Error> {
        let mut attempt = 0u32;
        loop {
            attempt += 1;
            let url = self.base_url.join(path.trim_start_matches('/'))?;
            let mut req = self.inner.request(method.clone(), url.clone());
            if let Some(q) = query {
                req = req.query(q);
            }
            if let Some(b) = body {
                req = req.json(b);
            }

            let res = match req.send().await {
                Ok(r) => r,
                Err(err) => {
                    if attempt >= self.max_retries {
                        return Err(err.into());
                    }
                    tokio::time::sleep(self.backoff * 2u32.pow(attempt - 1)).await;
                    continue;
                }
            };

            let status = res.status();
            let retry_after = res
                .headers()
                .get("retry-after")
                .and_then(|v| v.to_str().ok())
                .and_then(|s| s.parse::<u64>().ok());

            let bytes = res.bytes().await.map_err(Error::from)?;

            if status.is_success() {
                return parse_envelope(&bytes);
            }

            let err = decode_error(status, retry_after, &bytes);
            let should_retry = matches!(
                err,
                Error::RateLimit { .. } | Error::Network(_) | Error::Api { status: 500..=599, .. }
            );
            if should_retry && attempt < self.max_retries {
                tokio::time::sleep(self.backoff * 2u32.pow(attempt - 1)).await;
                continue;
            }
            return Err(err);
        }
    }
}

fn parse_envelope<R: DeserializeOwned>(bytes: &[u8]) -> Result<R, Error> {
    if bytes.is_empty() {
        return serde_json::from_value(Value::Null).map_err(Error::from);
    }
    let value: Value = serde_json::from_slice(bytes)?;
    if let Value::Object(map) = &value {
        if map.contains_key("success") {
            let env: ApiEnvelope<R> = serde_json::from_value(value.clone())?;
            if env.success {
                if let Some(data) = env.data {
                    return Ok(data);
                }
                return serde_json::from_value(Value::Null).map_err(Error::from);
            }
            let api_err = env.error.unwrap_or(ApiError {
                code: "UNKNOWN_ERROR".into(),
                message: "API returned success=false".into(),
            });
            return Err(Error::Api {
                status: 0,
                code: api_err.code,
                message: api_err.message,
            });
        }
    }
    serde_json::from_value(value).map_err(Error::from)
}

fn decode_error(status: StatusCode, retry_after: Option<u64>, bytes: &[u8]) -> Error {
    let value: Value = serde_json::from_slice(bytes).unwrap_or(Value::Null);
    let code = value
        .pointer("/error/code")
        .and_then(Value::as_str)
        .unwrap_or("UNKNOWN_ERROR")
        .to_string();
    let message = value
        .pointer("/error/message")
        .and_then(Value::as_str)
        .or_else(|| value.get("detail").and_then(Value::as_str))
        .or_else(|| value.get("message").and_then(Value::as_str))
        .unwrap_or_else(|| status.canonical_reason().unwrap_or("error"))
        .to_string();

    match status {
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Error::Authentication { message },
        StatusCode::NOT_FOUND => Error::NotFound { code, message },
        StatusCode::TOO_MANY_REQUESTS => Error::RateLimit {
            message,
            retry_after_seconds: retry_after,
        },
        s if s.is_client_error() => Error::Validation { code, message },
        s => Error::Api {
            status: s.as_u16(),
            code,
            message,
        },
    }
}

/// Top-level entrypoint to the ChainBridge SDK.
#[derive(Debug, Clone)]
pub struct ChainBridgeClient {
    inner: Arc<HttpClient>,
}

impl ChainBridgeClient {
    pub fn new(cfg: ClientConfig) -> Result<Self, Error> {
        Ok(Self {
            inner: Arc::new(HttpClient::new(&cfg)?),
        })
    }

    /// Build with default config and the given base URL + API key.
    pub fn with_api_key(base_url: impl Into<String>, api_key: impl Into<String>) -> Result<Self, Error> {
        Self::new(ClientConfig {
            base_url: base_url.into(),
            api_key: Some(api_key.into()),
            ..Default::default()
        })
    }

    pub fn orders(&self) -> OrdersResource {
        OrdersResource::new(self.inner.clone())
    }

    pub fn htlcs(&self) -> HtlcsResource {
        HtlcsResource::new(self.inner.clone())
    }

    pub fn swaps(&self) -> SwapsResource {
        SwapsResource::new(self.inner.clone())
    }

    pub fn proofs(&self) -> ProofsResource {
        ProofsResource::new(self.inner.clone())
    }

    pub fn market(&self) -> MarketResource {
        MarketResource::new(self.inner.clone())
    }

    pub fn assets(&self) -> AssetsResource {
        AssetsResource::new(self.inner.clone())
    }

    pub fn analytics(&self) -> AnalyticsResource {
        AnalyticsResource::new(self.inner.clone())
    }

    pub fn auth(&self) -> AuthResource {
        AuthResource::new(self.inner.clone())
    }

    pub fn base_url(&self) -> &Url {
        &self.inner.base_url
    }
}
