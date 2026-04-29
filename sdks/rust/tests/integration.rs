use chainbridge_sdk::{ChainBridgeClient, ClientConfig};
use serde_json::json;
use wiremock::matchers::{header, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

async fn make_client(server: &MockServer) -> ChainBridgeClient {
    ChainBridgeClient::new(ClientConfig {
        base_url: server.uri(),
        api_key: Some("cb_test".into()),
        max_retries: 1,
        ..Default::default()
    })
    .unwrap()
}

#[tokio::test]
async fn create_order_unwraps_envelope() {
    let server = MockServer::start().await;
    Mock::given(method("POST"))
        .and(path("/api/v1/orders"))
        .and(header("X-API-Key", "cb_test"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({
            "success": true,
            "data": {
                "order_id": "order-1",
                "from_chain": "stellar",
                "to_chain": "bitcoin",
                "from_asset": "XLM",
                "to_asset": "BTC",
                "from_amount": "1000",
                "to_amount": "100",
                "creator": "GA...",
                "status": "open",
                "expiry": "2026-04-30T00:00:00Z",
                "created_at": "2026-04-29T00:00:00Z"
            },
            "error": null
        })))
        .mount(&server)
        .await;

    let client = make_client(&server).await;
    let order = client
        .orders()
        .create(&chainbridge_sdk::CreateOrderInput {
            from_chain: "stellar".into(),
            to_chain: "bitcoin".into(),
            from_asset: "XLM".into(),
            to_asset: "BTC".into(),
            from_amount: "1000".into(),
            to_amount: "100".into(),
            sender_address: "GA...".into(),
            expiry: 3600,
        })
        .await
        .unwrap();
    assert_eq!(order.order_id, "order-1");
    assert_eq!(order.status, "open");
}

#[tokio::test]
async fn unauthorized_returns_authentication_error() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v1/orders/missing"))
        .respond_with(ResponseTemplate::new(401).set_body_json(json!({"detail": "bad"})))
        .mount(&server)
        .await;

    let client = make_client(&server).await;
    let err = client.orders().get("missing").await.unwrap_err();
    matches!(err, chainbridge_sdk::Error::Authentication { .. });
}

#[tokio::test]
async fn rate_limit_carries_retry_after() {
    let server = MockServer::start().await;
    Mock::given(method("GET"))
        .and(path("/api/v1/market/fees/stellar"))
        .respond_with(
            ResponseTemplate::new(429)
                .insert_header("Retry-After", "5")
                .set_body_json(json!({"detail": "slow"})),
        )
        .mount(&server)
        .await;

    let client = ChainBridgeClient::new(ClientConfig {
        base_url: server.uri(),
        api_key: Some("cb_test".into()),
        max_retries: 1,
        backoff: std::time::Duration::from_millis(0),
        ..Default::default()
    })
    .unwrap();
    let err = client.market().get_fee("stellar").await.unwrap_err();
    if let chainbridge_sdk::Error::RateLimit {
        retry_after_seconds,
        ..
    } = err
    {
        assert_eq!(retry_after_seconds, Some(5));
    } else {
        panic!("expected RateLimit, got {err:?}");
    }
}
