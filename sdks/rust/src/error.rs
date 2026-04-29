use thiserror::Error;

/// Top-level error type for the ChainBridge SDK.
#[derive(Debug, Error)]
pub enum Error {
    /// 401/403 — invalid or missing API key.
    #[error("authentication error: {message}")]
    Authentication { message: String },

    /// 404 — resource not found.
    #[error("not found: {code}: {message}")]
    NotFound { code: String, message: String },

    /// 400/422 — request validation rejected by the API.
    #[error("validation error: {code}: {message}")]
    Validation { code: String, message: String },

    /// 429 — rate limited. `retry_after_seconds` is populated when the API supplies it.
    #[error("rate limited: {message}")]
    RateLimit {
        message: String,
        retry_after_seconds: Option<u64>,
    },

    /// 5xx or generic API error.
    #[error("api error ({status}): {code}: {message}")]
    Api {
        status: u16,
        code: String,
        message: String,
    },

    /// Transport/network failure.
    #[error("network error: {0}")]
    Network(String),

    /// JSON deserialization failure.
    #[error("invalid response body: {0}")]
    Decode(String),

    /// Configuration error (invalid URL, missing required field, etc.).
    #[error("configuration error: {0}")]
    Config(String),

    #[cfg(feature = "ws")]
    #[error("websocket error: {0}")]
    WebSocket(String),
}

impl From<reqwest::Error> for Error {
    fn from(err: reqwest::Error) -> Self {
        if err.is_timeout() || err.is_connect() {
            Error::Network(err.to_string())
        } else if err.is_decode() {
            Error::Decode(err.to_string())
        } else {
            Error::Network(err.to_string())
        }
    }
}

impl From<url::ParseError> for Error {
    fn from(err: url::ParseError) -> Self {
        Error::Config(err.to_string())
    }
}

impl From<serde_json::Error> for Error {
    fn from(err: serde_json::Error) -> Self {
        Error::Decode(err.to_string())
    }
}
