"""Tests for timelock validation service (#56)."""

from datetime import datetime, timezone

import pytest

from app.services.timelock_validation import (
    CHAIN_TIMELOCK_RECOMMENDATIONS,
    MAX_TIMELOCK_DURATION,
    MIN_TIMELOCK_DURATION,
    TimelockValidationService,
    TimelockWarningLevel,
)


@pytest.fixture
def service():
    return TimelockValidationService()


def _future_ts(seconds: int) -> int:
    return int(datetime.now(timezone.utc).timestamp()) + seconds


class TestTimelockValidation:
    def test_valid_timelock_no_warnings(self, service):
        ts = _future_ts(14400)  # 4 hours
        result = service.validate_timelock(ts)
        assert result.valid is True
        assert len(result.warnings) == 0

    def test_rejects_past_timelock(self, service):
        ts = int(datetime.now(timezone.utc).timestamp()) - 3600
        result = service.validate_timelock(ts)
        assert result.valid is False
        assert any(w.level == TimelockWarningLevel.ERROR for w in result.warnings)
        assert any("past" in w.message.lower() for w in result.warnings)

    def test_rejects_below_minimum_duration(self, service):
        ts = _future_ts(1800)  # 30 minutes
        result = service.validate_timelock(ts)
        assert result.valid is False
        assert any("minimum" in w.message.lower() for w in result.warnings)

    def test_rejects_above_maximum_duration(self, service):
        ts = _future_ts(MAX_TIMELOCK_DURATION + 3600)  # 8 days
        result = service.validate_timelock(ts)
        assert result.valid is False
        assert any("maximum" in w.message.lower() for w in result.warnings)

    def test_warns_short_but_valid_duration(self, service):
        ts = _future_ts(3700)  # just above 1 hour, below optimal 2 hours
        result = service.validate_timelock(ts)
        assert result.valid is True
        assert any(w.level == TimelockWarningLevel.WARNING for w in result.warnings)

    def test_warns_unusually_long_duration(self, service):
        ts = _future_ts(345600)  # 4 days
        result = service.validate_timelock(ts)
        assert result.valid is True
        assert any("long" in w.message.lower() for w in result.warnings)

    def test_exact_minimum_boundary(self, service):
        ts = _future_ts(MIN_TIMELOCK_DURATION)
        result = service.validate_timelock(ts)
        assert result.valid is True

    def test_exact_maximum_boundary(self, service):
        ts = _future_ts(MAX_TIMELOCK_DURATION)
        result = service.validate_timelock(ts)
        assert result.valid is True

    def test_chain_specific_warning_bitcoin(self, service):
        ts = _future_ts(5400)  # 1.5 hours, below bitcoin min of 2 hours
        result = service.validate_timelock(ts, source_chain="bitcoin")
        assert result.valid is True
        assert any("bitcoin" in w.message.lower() for w in result.warnings)

    def test_chain_specific_warning_dest_chain(self, service):
        ts = _future_ts(5400)
        result = service.validate_timelock(ts, dest_chain="bitcoin")
        assert result.valid is True
        assert any("bitcoin" in w.message.lower() for w in result.warnings)

    def test_recommended_duration_with_chains(self, service):
        ts = _future_ts(14400)
        result = service.validate_timelock(
            ts, source_chain="stellar", dest_chain="bitcoin"
        )
        assert result.recommended_duration is not None
        assert result.recommended_duration > 0

    def test_adjusted_timelock_on_invalid(self, service):
        ts = _future_ts(600)  # 10 minutes, invalid
        result = service.validate_timelock(ts, source_chain="stellar")
        assert result.valid is False
        assert result.adjusted_timelock is not None
        assert result.adjusted_timelock > ts

    def test_to_dict_format(self, service):
        ts = _future_ts(14400)
        result = service.validate_timelock(ts)
        d = result.to_dict()
        assert isinstance(d, dict)
        assert "valid" in d
        assert "warnings" in d
        assert isinstance(d["warnings"], list)


class TestChainRecommendations:
    def test_get_all_recommendations(self, service):
        recs = service.get_chain_recommendations()
        assert "stellar" in recs
        assert "bitcoin" in recs
        assert "ethereum" in recs

    def test_get_single_chain_recommendation(self, service):
        recs = service.get_chain_recommendations("stellar")
        assert "stellar" in recs
        assert "bitcoin" not in recs

    def test_unknown_chain_returns_error(self, service):
        recs = service.get_chain_recommendations("unknown_chain")
        assert "error" in recs

    def test_recommendations_have_required_fields(self, service):
        for chain, rec in CHAIN_TIMELOCK_RECOMMENDATIONS.items():
            assert "min_duration" in rec
            assert "recommended_duration" in rec
            assert "max_duration" in rec
            assert "avg_confirmation_time" in rec
            assert "description" in rec
            assert rec["min_duration"] <= rec["recommended_duration"]
            assert rec["recommended_duration"] <= rec["max_duration"]
