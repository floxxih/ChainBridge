"""Tests for swap rate calculator service (#70)."""

from unittest.mock import patch

import pytest

from app.services.fee_estimation import FeeEstimationService
from app.services.price_oracle import PriceOracleService
from app.services.rate_calculator import (
    CEX_FEE_RATES,
    SLIPPAGE_TIERS,
    SwapRateCalculatorService,
)


@pytest.fixture
def price_oracle():
    return PriceOracleService()


@pytest.fixture
def fee_service():
    return FeeEstimationService()


@pytest.fixture
def service(price_oracle, fee_service):
    return SwapRateCalculatorService(price_oracle, fee_service)


class TestRateCalculation:
    @pytest.mark.anyio
    async def test_calculate_rate(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            quote = await service.calculate_rate("XLM", "ETH", 1000.0)
            assert quote.from_asset == "XLM"
            assert quote.to_asset == "ETH"
            assert quote.from_amount == 1000.0
            assert quote.exchange_rate > 0
            assert quote.to_amount > 0
            assert quote.slippage_estimate > 0
            assert quote.effective_rate > 0
            assert quote.effective_rate <= quote.exchange_rate

    @pytest.mark.anyio
    async def test_calculate_rate_with_chains(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            quote = await service.calculate_rate(
                "XLM",
                "ETH",
                1000.0,
                source_chain="stellar",
                dest_chain="ethereum",
            )
            assert quote.fee_total_usd is not None
            assert quote.fee_total_usd > 0

    @pytest.mark.anyio
    async def test_slippage_increases_with_amount(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            small = await service.calculate_rate("BTC", "ETH", 0.1)
            large = await service.calculate_rate("BTC", "ETH", 10.0)
            assert large.slippage_estimate >= small.slippage_estimate

    @pytest.mark.anyio
    async def test_rate_quote_to_dict(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            quote = await service.calculate_rate("XLM", "ETH", 100.0)
            d = quote.to_dict()
            assert "from_asset" in d
            assert "to_amount" in d
            assert "exchange_rate" in d
            assert "slippage_estimate" in d


class TestCEXComparison:
    @pytest.mark.anyio
    async def test_compare_with_cex(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            comparisons = await service.compare_with_cex("XLM", "ETH", 1000.0)
            assert len(comparisons) >= 1 + len(CEX_FEE_RATES)
            assert comparisons[0]["exchange"] == "ChainBridge (DEX)"

    @pytest.mark.anyio
    async def test_cex_comparison_has_savings(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            comparisons = await service.compare_with_cex("XLM", "ETH", 1000.0)
            for comp in comparisons[1:]:
                assert "savings_vs_cex" in comp
                assert "fee_percent" in comp

    @pytest.mark.anyio
    async def test_zero_rate_returns_empty(self, service, price_oracle):
        with patch.object(
            price_oracle,
            "get_exchange_rate",
            return_value={"rate": 0.0, "from_price_usd": 0.0},
        ):
            comparisons = await service.compare_with_cex("FAKE", "ETH", 100.0)
            assert comparisons == []


class TestRateHistory:
    @pytest.mark.anyio
    async def test_rate_history_recorded(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            await service.calculate_rate("XLM", "ETH", 100.0)
            history = service.get_rate_history()
            assert len(history) >= 1

    @pytest.mark.anyio
    async def test_rate_history_filter(self, service, price_oracle):
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            await service.calculate_rate("XLM", "ETH", 100.0)
            await service.calculate_rate("BTC", "ETH", 1.0)
            history = service.get_rate_history(from_asset="XLM")
            assert all(r["from_asset"] == "XLM" for r in history)


class TestRateAlerts:
    def test_add_rate_alert(self, service):
        result = service.add_rate_alert("XLM", "ETH", 0.0001)
        assert result["status"] == "active"
        assert result["from_asset"] == "XLM"
        assert result["to_asset"] == "ETH"

    def test_get_rate_alerts(self, service):
        service.add_rate_alert("XLM", "ETH", 0.0001)
        alerts = service.get_rate_alerts()
        assert len(alerts) >= 1
        assert alerts[-1]["triggered"] is False

    @pytest.mark.anyio
    async def test_alert_triggered_on_rate_match(self, service, price_oracle):
        service.add_rate_alert("XLM", "ETH", 0.00001)  # very low target
        with patch.object(price_oracle, "_fetch_coingecko", return_value=None):
            await service.calculate_rate("XLM", "ETH", 100.0)
            alerts = service.get_rate_alerts()
            triggered = [a for a in alerts if a["triggered"]]
            assert len(triggered) >= 1


class TestOptimizationTips:
    def test_tips_for_large_amount(self, service):
        tips = service.get_optimization_tips("BTC", "ETH", 1.0)
        assert isinstance(tips, list)
        assert len(tips) > 0

    def test_tips_for_small_amount(self, service):
        tips = service.get_optimization_tips("XLM", "ETH", 10.0)
        assert any("batch" in t.lower() for t in tips)


class TestSlippageTiers:
    def test_slippage_tiers_ordered(self):
        for i in range(len(SLIPPAGE_TIERS) - 1):
            assert SLIPPAGE_TIERS[i][0] < SLIPPAGE_TIERS[i + 1][0]

    def test_slippage_increases_with_amount(self):
        for i in range(len(SLIPPAGE_TIERS) - 1):
            assert SLIPPAGE_TIERS[i][1] <= SLIPPAGE_TIERS[i + 1][1]
