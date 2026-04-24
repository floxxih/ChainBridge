use axum::{
    extract::State,
    http::{header, StatusCode},
    response::IntoResponse,
    routing::get,
    Json, Router,
};
use prometheus::{
    opts, Encoder, Gauge, GaugeVec, IntCounterVec, IntGaugeVec, Registry, TextEncoder,
};
use serde_json::json;
use std::{net::SocketAddr, time::Instant};

#[derive(Clone)]
pub struct RelayerMetrics {
    registry: Registry,
    chain_last_block: IntGaugeVec,
    chain_last_poll_timestamp: GaugeVec,
    chain_poll_errors_total: IntCounterVec,
    chain_events_total: IntCounterVec,
    chain_healthy: IntGaugeVec,
    relayer_healthy: Gauge,
    relayer_uptime_seconds: Gauge,
    tx_submissions_total: IntCounterVec,
    tx_submission_errors_total: IntCounterVec,
    tx_retries_total: IntCounterVec,
    tx_retry_failures_total: IntCounterVec,
    started_at: Instant,
}

impl RelayerMetrics {
    pub fn new(version: &str) -> Self {
        let registry = Registry::new();

        let chain_last_block = IntGaugeVec::new(
            opts!(
                "chainbridge_relayer_chain_last_block",
                "Last observed block/ledger for each monitored chain"
            ),
            &["chain"],
        )
        .expect("chain_last_block metric");

        let chain_last_poll_timestamp = GaugeVec::new(
            opts!(
                "chainbridge_relayer_chain_last_poll_timestamp_seconds",
                "UNIX timestamp of the most recent successful poll per chain"
            ),
            &["chain"],
        )
        .expect("chain_last_poll_timestamp metric");

        let chain_poll_errors_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_chain_poll_errors_total",
                "Total polling errors by monitored chain"
            ),
            &["chain"],
        )
        .expect("chain_poll_errors_total metric");

        let chain_events_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_chain_events_total",
                "Total relevant events detected by monitored chain"
            ),
            &["chain"],
        )
        .expect("chain_events_total metric");

        let chain_healthy = IntGaugeVec::new(
            opts!(
                "chainbridge_relayer_chain_healthy",
                "Relayer chain health (1 healthy / 0 unhealthy)"
            ),
            &["chain"],
        )
        .expect("chain_healthy metric");

        let relayer_healthy = Gauge::with_opts(opts!(
            "chainbridge_relayer_healthy",
            "Overall relayer process health (1 healthy / 0 degraded)"
        ))
        .expect("relayer_healthy metric");

        let relayer_uptime_seconds = Gauge::with_opts(opts!(
            "chainbridge_relayer_uptime_seconds",
            "Relayer process uptime in seconds"
        ))
        .expect("relayer_uptime_seconds metric");

        let tx_submissions_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_tx_submissions_total",
                "Total transaction submissions attempted"
            ),
            &["chain"],
        )
        .expect("tx_submissions_total metric");

        let tx_submission_errors_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_tx_submission_errors_total",
                "Total transaction submission errors"
            ),
            &["chain"],
        )
        .expect("tx_submission_errors_total metric");

        let tx_retries_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_tx_retries_total",
                "Total transaction retries attempted"
            ),
            &["chain"],
        )
        .expect("tx_retries_total metric");

        let tx_retry_failures_total = IntCounterVec::new(
            opts!(
                "chainbridge_relayer_tx_retry_failures_total",
                "Total transaction retries that failed permanently"
            ),
            &["chain"],
        )
        .expect("tx_retry_failures_total metric");

        let relayer_build_info = GaugeVec::new(
            opts!(
                "chainbridge_relayer_build_info",
                "Relayer build information metric"
            ),
            &["version"],
        )
        .expect("relayer_build_info metric");

        registry
            .register(Box::new(chain_last_block.clone()))
            .expect("register chain_last_block");
        registry
            .register(Box::new(chain_last_poll_timestamp.clone()))
            .expect("register chain_last_poll_timestamp");
        registry
            .register(Box::new(chain_poll_errors_total.clone()))
            .expect("register chain_poll_errors_total");
        registry
            .register(Box::new(chain_events_total.clone()))
            .expect("register chain_events_total");
        registry
            .register(Box::new(chain_healthy.clone()))
            .expect("register chain_healthy");
        registry
            .register(Box::new(relayer_healthy.clone()))
            .expect("register relayer_healthy");
        registry
            .register(Box::new(relayer_uptime_seconds.clone()))
            .expect("register relayer_uptime_seconds");
        registry
            .register(Box::new(tx_submissions_total.clone()))
            .expect("register tx_submissions_total");
        registry
            .register(Box::new(tx_submission_errors_total.clone()))
            .expect("register tx_submission_errors_total");
        registry
            .register(Box::new(tx_retries_total.clone()))
            .expect("register tx_retries_total");
        registry
            .register(Box::new(tx_retry_failures_total.clone()))
            .expect("register tx_retry_failures_total");
        registry
            .register(Box::new(relayer_build_info.clone()))
            .expect("register relayer_build_info");

        relayer_build_info.with_label_values(&[version]).set(1.0);
        relayer_healthy.set(1.0);

        Self {
            registry,
            chain_last_block,
            chain_last_poll_timestamp,
            chain_poll_errors_total,
            chain_events_total,
            chain_healthy,
            relayer_healthy,
            relayer_uptime_seconds,
            tx_submissions_total,
            tx_submission_errors_total,
            tx_retries_total,
            tx_retry_failures_total,
            started_at: Instant::now(),
        }
    }

    pub fn mark_poll_success(&self, chain: &str, latest_block: u64, events_found: u64) {
        self.update_uptime();
        self.chain_last_block
            .with_label_values(&[chain])
            .set(latest_block as i64);
        self.chain_last_poll_timestamp
            .with_label_values(&[chain])
            .set(current_unix_timestamp());
        self.chain_events_total
            .with_label_values(&[chain])
            .inc_by(events_found);
        self.chain_healthy.with_label_values(&[chain]).set(1);
        self.relayer_healthy.set(1.0);
    }

    pub fn mark_poll_error(&self, chain: &str) {
        self.update_uptime();
        self.chain_poll_errors_total.with_label_values(&[chain]).inc();
        self.chain_healthy.with_label_values(&[chain]).set(0);
        self.relayer_healthy.set(0.0);
    }

    pub fn mark_started(&self, chain: &str) {
        self.chain_healthy.with_label_values(&[chain]).set(1);
        self.chain_last_poll_timestamp
            .with_label_values(&[chain])
            .set(current_unix_timestamp());
    }

    pub fn mark_tx_submission(&self, chain: &str) {
        self.tx_submissions_total.with_label_values(&[chain]).inc();
    }

    pub fn mark_tx_error(&self, chain: &str) {
        self.tx_submission_errors_total.with_label_values(&[chain]).inc();
    }

    pub fn mark_tx_retry(&self, chain: &str) {
        self.tx_retries_total.with_label_values(&[chain]).inc();
    }

    pub fn mark_tx_retry_failure(&self, chain: &str) {
        self.tx_retry_failures_total.with_label_values(&[chain]).inc();
    }

    fn update_uptime(&self) {
        self.relayer_uptime_seconds
            .set(self.started_at.elapsed().as_secs_f64());
    }
}

pub async fn serve(metrics: RelayerMetrics, bind_addr: SocketAddr) -> std::io::Result<()> {
    let app = Router::new()
        .route("/metrics", get(metrics_handler))
        .route("/health", get(health_handler))
        .with_state(metrics);

    let listener = tokio::net::TcpListener::bind(bind_addr).await?;
    axum::serve(listener, app).await
}

async fn metrics_handler(State(metrics): State<RelayerMetrics>) -> impl IntoResponse {
    metrics.update_uptime();
    let metric_families = metrics.registry.gather();
    let encoder = TextEncoder::new();

    let mut buffer = Vec::new();
    if encoder.encode(&metric_families, &mut buffer).is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "failed to encode metrics".to_string(),
        )
            .into_response();
    }

    (
        StatusCode::OK,
        [(header::CONTENT_TYPE, encoder.format_type())],
        String::from_utf8(buffer).unwrap_or_default(),
    )
        .into_response()
}

async fn health_handler(State(metrics): State<RelayerMetrics>) -> impl IntoResponse {
    metrics.update_uptime();
    let status = if metrics.relayer_healthy.get() >= 1.0 {
        "healthy"
    } else {
        "degraded"
    };
    (StatusCode::OK, Json(json!({ "status": status }))).into_response()
}

fn current_unix_timestamp() -> f64 {
    use std::time::{SystemTime, UNIX_EPOCH};

    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs_f64())
        .unwrap_or(0.0)
}
