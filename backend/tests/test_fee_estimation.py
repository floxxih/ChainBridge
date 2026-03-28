"""Tests for fee estimation service (#58)."""

import pytest

from app.services.fee_estimation import (
    CHAIN_FEE_CONFIG,
    FeeEstimationService,
    RELAYER_FEE_PERCENT,
    MIN_RELAYER_FEE_USD,
    MAX_RELAYER_FEE_USD,
)


@pytest.fixture
def service():
    return FeeEstimationService()


class TestChainFeeEstimation:
    def test_estimate_stellar_fee(self, service):
        estimate = service.estimate_chain_fee("stellar")
        assert estimate.chain == "stellar"
        assert estimate.asset == "XLM"
        assert estimate.total_fee > 0
        assert len(estimate.components) == 2

    def test_estimate_bitcoin_fee(self, service):
        estimate = service.estimate_chain_fee("bitcoin")
        assert estimate.chain == "bitcoin"
        assert estimate.asset == "BTC"
        assert estimate.total_fee > 0

    def test_estimate_ethereum_fee(self, service):
        estimate = service.estimate_chain_fee("ethereum")
        assert estimate.chain == "ethereum"
        assert estimate.asset == "ETH"
        assert estimate.total_fee > 0

    def test_estimate_unknown_chain(self, service):
        estimate = service.estimate_chain_fee("unknown")
        assert estimate.chain == "unknown"
        assert estimate.total_fee == 0.0
        assert len(estimate.components) == 0

    def test_fee_components_structure(self, service):
        estimate = service.estimate_chain_fee("stellar")
        for comp in estimate.components:
            assert comp.name in ("network_fee", "contract_fee")
            assert comp.amount >= 0
            assert comp.asset != ""
            assert comp.description != ""

    def test_to_dict_format(self, service):
        estimate = service.estimate_chain_fee("stellar")
        d = estimate.to_dict()
        assert "chain" in d
        assert "total_fee" in d
        assert "components" in d
        assert "estimated_at" in d


class TestSwapFeeEstimation:
    def test_estimate_swap_fees(self, service):
        breakdown = service.estimate_swap_fees("stellar", "bitcoin", 1000.0)
        assert breakdown.source_chain_fee.chain == "stellar"
        assert breakdown.dest_chain_fee.chain == "bitcoin"
        assert breakdown.relayer_fee.amount > 0

    def test_relayer_fee_minimum(self, service):
        breakdown = service.estimate_swap_fees("stellar", "bitcoin", 1.0)
        assert breakdown.relayer_fee.amount >= MIN_RELAYER_FEE_USD

    def test_relayer_fee_maximum(self, service):
        breakdown = service.estimate_swap_fees("stellar", "bitcoin", 1_000_000.0)
        assert breakdown.relayer_fee.amount <= MAX_RELAYER_FEE_USD

    def test_relayer_fee_percentage(self, service):
        amount = 10000.0
        breakdown = service.estimate_swap_fees("stellar", "bitcoin", amount)
        expected = amount * RELAYER_FEE_PERCENT
        assert breakdown.relayer_fee.amount == pytest.approx(expected, abs=0.01)

    def test_swap_breakdown_to_dict(self, service):
        breakdown = service.estimate_swap_fees("stellar", "ethereum", 500.0)
        d = breakdown.to_dict()
        assert "source_chain_fee" in d
        assert "dest_chain_fee" in d
        assert "relayer_fee" in d


class TestFeeComparison:
    def test_compare_all_chains(self, service):
        comparisons = service.compare_fees()
        assert len(comparisons) == len(CHAIN_FEE_CONFIG)
        assert any(c.recommended for c in comparisons)

    def test_compare_specific_chains(self, service):
        comparisons = service.compare_fees(["stellar", "bitcoin"])
        assert len(comparisons) == 2

    def test_cheapest_chain_recommended(self, service):
        comparisons = service.compare_fees()
        recommended = [c for c in comparisons if c.recommended]
        assert len(recommended) >= 1
        min_fee = min(c.fee for c in comparisons)
        assert recommended[0].fee == min_fee


class TestFeeHistory:
    def test_fee_recorded_on_estimate(self, service):
        service.estimate_chain_fee("stellar")
        history = service.get_fee_history()
        assert len(history) >= 1
        assert history[-1]["chain"] == "stellar"

    def test_filter_history_by_chain(self, service):
        service.estimate_chain_fee("stellar")
        service.estimate_chain_fee("bitcoin")
        history = service.get_fee_history(chain="stellar")
        assert all(r["chain"] == "stellar" for r in history)

    def test_history_limit(self, service):
        for _ in range(5):
            service.estimate_chain_fee("stellar")
        history = service.get_fee_history(limit=2)
        assert len(history) == 2


class TestFeeOptimization:
    def test_optimization_suggestions(self, service):
        suggestions = service.get_optimization_suggestions("ethereum", "bitcoin")
        assert isinstance(suggestions, list)

    def test_suggestions_for_high_fee_chains(self, service):
        suggestions = service.get_optimization_suggestions("ethereum", "bitcoin")
        assert any(s["type"] in ("alternative_route", "timing") for s in suggestions)
