"""Tests for price oracle service (#68)."""

from unittest.mock import patch

import pytest

from app.services.price_oracle import (
    DEFAULT_PRICES,
    PriceOracleService,
)


@pytest.fixture
def service():
    return PriceOracleService()


class TestGetPrice:
    @pytest.mark.anyio
    async def test_returns_default_price_when_api_unavailable(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            price = await service.get_price("XLM")
            assert price.asset == "XLM"
            assert price.price_usd == DEFAULT_PRICES["XLM"]
            assert price.source == "default"
            assert price.confidence == "medium"

    @pytest.mark.anyio
    async def test_returns_coingecko_price_when_available(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=0.18):
            price = await service.get_price("XLM")
            assert price.asset == "XLM"
            assert price.price_usd == 0.18
            assert price.source == "coingecko"
            assert price.confidence == "high"

    @pytest.mark.anyio
    async def test_unknown_asset_returns_zero(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            price = await service.get_price("UNKNOWN")
            assert price.price_usd == 0.0
            assert price.confidence == "low"

    @pytest.mark.anyio
    async def test_price_caching(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=0.16) as mock:
            await service.get_price("XLM")
            await service.get_price("XLM")  # should be cached
            assert mock.call_count == 1

    @pytest.mark.anyio
    async def test_bulk_prices(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            prices = await service.get_prices(["XLM", "BTC", "ETH"])
            assert "XLM" in prices
            assert "BTC" in prices
            assert "ETH" in prices


class TestExchangeRate:
    @pytest.mark.anyio
    async def test_exchange_rate_calculation(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            rate = await service.get_exchange_rate("XLM", "ETH")
            assert rate["from_asset"] == "XLM"
            assert rate["to_asset"] == "ETH"
            assert rate["rate"] > 0
            assert rate["inverse_rate"] > 0

    @pytest.mark.anyio
    async def test_exchange_rate_inverse(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            rate_ab = await service.get_exchange_rate("XLM", "ETH")
            # Clear cache so it re-fetches
            service._cache.clear()
            rate_ba = await service.get_exchange_rate("ETH", "XLM")
            assert rate_ab["rate"] == pytest.approx(rate_ba["inverse_rate"], rel=0.01)

    @pytest.mark.anyio
    async def test_exchange_rate_same_asset(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            rate = await service.get_exchange_rate("BTC", "BTC")
            assert rate["rate"] == pytest.approx(1.0, abs=0.01)


class TestPriceDeviation:
    def test_deviation_alert_triggered(self, service):
        alert = service.check_price_deviation("XLM", 0.15, 0.20)
        assert alert is not None
        assert alert.alert_type == "deviation"
        assert alert.severity in ("warning", "critical")

    def test_no_alert_within_threshold(self, service):
        alert = service.check_price_deviation("XLM", 0.15, 0.155)
        assert alert is None

    def test_critical_alert_for_large_deviation(self, service):
        alert = service.check_price_deviation("BTC", 50000, 100000)
        assert alert is not None
        assert alert.severity == "critical"


class TestPriceHistory:
    @pytest.mark.anyio
    async def test_history_recorded(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            await service.get_price("XLM")
            history = service.get_price_history()
            assert len(history) >= 1
            assert history[-1]["asset"] == "XLM"

    @pytest.mark.anyio
    async def test_history_filter_by_asset(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            await service.get_price("XLM")
            await service.get_price("BTC")
            history = service.get_price_history(asset="XLM")
            assert all(r["asset"] == "XLM" for r in history)


class TestAlerts:
    @pytest.mark.anyio
    async def test_unavailable_asset_creates_alert(self, service):
        with patch.object(service, "_fetch_coingecko", return_value=None):
            await service.get_price("FAKECOIN")
            alerts = service.get_alerts()
            assert len(alerts) >= 1
            assert alerts[-1]["alert_type"] == "unavailable"

    def test_get_alerts_filter_by_asset(self, service):
        service.check_price_deviation("XLM", 0.10, 0.20)
        service.check_price_deviation("BTC", 50000, 70000)
        xlm_alerts = service.get_alerts(asset="XLM")
        assert all(a["asset"] == "XLM" for a in xlm_alerts)
