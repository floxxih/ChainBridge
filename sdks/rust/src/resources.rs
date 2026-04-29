//! Resource clients — typed wrappers around REST endpoints.

use std::sync::Arc;

use reqwest::Method;
use serde::Serialize;
use serde_json::Value;

use crate::client::HttpClient;
use crate::error::Error;
use crate::types::{
    Asset, ClaimHtlcInput, CreateHtlcInput, CreateOrderInput, FeeBreakdown, FeeEstimate,
    FeeEstimateInput, Htlc, Order, OrderListPage, RefundHtlcInput, SuccessRateStats, Swap,
    VolumeStats,
};

#[derive(Debug, Clone)]
pub struct OrdersResource(Arc<HttpClient>);

impl OrdersResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn create(&self, input: &CreateOrderInput) -> Result<Order, Error> {
        self.0
            .request::<_, Order>(Method::POST, "/api/v1/orders", Some(input), None)
            .await
    }

    pub async fn get(&self, order_id: &str) -> Result<Order, Error> {
        self.0
            .request::<(), Order>(
                Method::GET,
                &format!("/api/v1/orders/{order_id}"),
                None,
                None,
            )
            .await
    }

    pub async fn list(&self, query: &[(&str, String)]) -> Result<OrderListPage, Error> {
        self.0
            .request::<(), OrderListPage>(Method::GET, "/api/v1/orders", None, Some(query))
            .await
    }

    pub async fn cancel(&self, order_id: &str) -> Result<Order, Error> {
        self.0
            .request::<(), Order>(
                Method::DELETE,
                &format!("/api/v1/orders/{order_id}"),
                None,
                None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct HtlcsResource(Arc<HttpClient>);

impl HtlcsResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn create(&self, input: &CreateHtlcInput) -> Result<Htlc, Error> {
        self.0
            .request::<_, Htlc>(Method::POST, "/api/v1/htlcs", Some(input), None)
            .await
    }

    pub async fn get(&self, htlc_id: &str) -> Result<Htlc, Error> {
        self.0
            .request::<(), Htlc>(Method::GET, &format!("/api/v1/htlcs/{htlc_id}"), None, None)
            .await
    }

    pub async fn claim(&self, htlc_id: &str, input: &ClaimHtlcInput) -> Result<Htlc, Error> {
        self.0
            .request::<_, Htlc>(
                Method::POST,
                &format!("/api/v1/htlcs/{htlc_id}/claim"),
                Some(input),
                None,
            )
            .await
    }

    pub async fn refund(&self, htlc_id: &str, input: &RefundHtlcInput) -> Result<Htlc, Error> {
        self.0
            .request::<_, Htlc>(
                Method::POST,
                &format!("/api/v1/htlcs/{htlc_id}/refund"),
                Some(input),
                None,
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct SwapsResource(Arc<HttpClient>);

impl SwapsResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn execute<B: Serialize>(&self, input: &B) -> Result<Swap, Error> {
        self.0
            .request::<_, Swap>(Method::POST, "/api/v1/swaps", Some(input), None)
            .await
    }

    pub async fn get(&self, swap_id: &str) -> Result<Swap, Error> {
        self.0
            .request::<(), Swap>(Method::GET, &format!("/api/v1/swaps/{swap_id}"), None, None)
            .await
    }

    pub async fn list(&self, query: &[(&str, String)]) -> Result<Value, Error> {
        self.0
            .request::<(), Value>(Method::GET, "/api/v1/swaps", None, Some(query))
            .await
    }
}

#[derive(Debug, Clone)]
pub struct ProofsResource(Arc<HttpClient>);

impl ProofsResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn verify<B: Serialize>(&self, input: &B) -> Result<Value, Error> {
        self.0
            .request::<_, Value>(Method::POST, "/api/v1/proofs/verify", Some(input), None)
            .await
    }
}

#[derive(Debug, Clone)]
pub struct MarketResource(Arc<HttpClient>);

impl MarketResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn get_fee(&self, chain: &str) -> Result<FeeEstimate, Error> {
        self.0
            .request::<(), FeeEstimate>(
                Method::GET,
                &format!("/api/v1/market/fees/{chain}"),
                None,
                None,
            )
            .await
    }

    pub async fn estimate_fees(&self, input: &FeeEstimateInput) -> Result<FeeBreakdown, Error> {
        self.0
            .request::<_, FeeBreakdown>(
                Method::POST,
                "/api/v1/market/fees/estimate",
                Some(input),
                None,
            )
            .await
    }

    pub async fn get_rate(&self, from_asset: &str, to_asset: &str) -> Result<Value, Error> {
        self.0
            .request::<(), Value>(
                Method::GET,
                "/api/v1/market/rate",
                None,
                Some(&[
                    ("from_asset", from_asset.to_string()),
                    ("to_asset", to_asset.to_string()),
                ]),
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct AssetsResource(Arc<HttpClient>);

impl AssetsResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn list(&self, query: &[(&str, String)]) -> Result<Vec<Asset>, Error> {
        self.0
            .request::<(), Vec<Asset>>(Method::GET, "/api/v1/assets", None, Some(query))
            .await
    }
}

#[derive(Debug, Clone)]
pub struct AnalyticsResource(Arc<HttpClient>);

impl AnalyticsResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn volume(&self, query: &[(&str, String)]) -> Result<VolumeStats, Error> {
        self.0
            .request::<(), VolumeStats>(Method::GET, "/api/v1/analytics/volume", None, Some(query))
            .await
    }

    pub async fn success_rate(
        &self,
        query: &[(&str, String)],
    ) -> Result<SuccessRateStats, Error> {
        self.0
            .request::<(), SuccessRateStats>(
                Method::GET,
                "/api/v1/analytics/success-rate",
                None,
                Some(query),
            )
            .await
    }
}

#[derive(Debug, Clone)]
pub struct AuthResource(Arc<HttpClient>);

impl AuthResource {
    pub(crate) fn new(http: Arc<HttpClient>) -> Self {
        Self(http)
    }

    pub async fn create_api_key<B: Serialize>(&self, input: &B) -> Result<Value, Error> {
        self.0
            .request::<_, Value>(Method::POST, "/api/v1/auth/api-keys", Some(input), None)
            .await
    }

    pub async fn exchange_for_token(&self) -> Result<Value, Error> {
        self.0
            .request::<(), Value>(Method::POST, "/api/v1/auth/token", None, None)
            .await
    }

    pub async fn revoke_api_key(&self, key_id: &str) -> Result<Value, Error> {
        self.0
            .request::<(), Value>(
                Method::DELETE,
                &format!("/api/v1/auth/api-keys/{key_id}"),
                None,
                None,
            )
            .await
    }
}
