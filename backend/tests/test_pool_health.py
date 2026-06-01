"""Tests for pool health and reserve drift monitoring (#507)."""

from __future__ import annotations

import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

from app.services.pool_health import (
    DRIFT_CRITICAL_PCT,
    DRIFT_WARN_PCT,
    RATIO_CRITICAL_HIGH,
    RATIO_CRITICAL_LOW,
    RATIO_WARN_HIGH,
    RATIO_WARN_LOW,
    _classify,
    _safe_ratio,
    record_snapshot,
    get_pool_health,
    list_pool_health,
    get_pool_snapshots,
)


# ---------------------------------------------------------------------------
# Pure unit tests — no DB required
# ---------------------------------------------------------------------------


class TestSafeRatio:
    def test_normal(self):
        assert _safe_ratio(200, 100) == pytest.approx(2.0)

    def test_zero_denominator(self):
        assert _safe_ratio(100, 0) is None

    def test_equal_reserves(self):
        assert _safe_ratio(500, 500) == pytest.approx(1.0)

    def test_zero_numerator(self):
        assert _safe_ratio(0, 100) == pytest.approx(0.0)


class TestClassify:
    def test_healthy(self):
        assert _classify(1.0, 0.0) == "healthy"

    def test_healthy_no_drift(self):
        assert _classify(1.5, 5.0) == "healthy"

    def test_warning_drift(self):
        assert _classify(1.0, DRIFT_WARN_PCT) == "warning"

    def test_warning_negative_drift(self):
        assert _classify(1.0, -DRIFT_WARN_PCT) == "warning"

    def test_critical_drift(self):
        assert _classify(1.0, DRIFT_CRITICAL_PCT) == "critical"

    def test_warning_low_ratio(self):
        assert _classify(RATIO_WARN_LOW - 0.01, 0.0) == "warning"

    def test_warning_high_ratio(self):
        assert _classify(RATIO_WARN_HIGH + 0.1, 0.0) == "warning"

    def test_critical_low_ratio(self):
        assert _classify(RATIO_CRITICAL_LOW - 0.01, 0.0) == "critical"

    def test_critical_high_ratio(self):
        assert _classify(RATIO_CRITICAL_HIGH + 0.1, 0.0) == "critical"

    def test_none_ratio_is_critical(self):
        assert _classify(None, None) == "critical"

    def test_ratio_takes_priority_over_drift(self):
        # Even mild drift doesn't override a critical ratio.
        assert _classify(RATIO_CRITICAL_LOW - 0.01, 5.0) == "critical"


# ---------------------------------------------------------------------------
# Service tests — mock the DB session
# ---------------------------------------------------------------------------


def _make_snapshot(pool_id=1, reserve_a=1000, reserve_b=1000, ratio=1.0):
    snap = MagicMock()
    snap.id = "test-uuid"
    snap.pool_id = pool_id
    snap.asset_a = "XLM"
    snap.asset_b = "USDC"
    snap.reserve_a = reserve_a
    snap.reserve_b = reserve_b
    snap.ratio = ratio
    snap.captured_at = datetime.now(timezone.utc)
    return snap


def _make_health(pool_id=1, status="healthy", ratio=1.0, drift=0.0):
    h = MagicMock()
    h.pool_id = pool_id
    h.asset_a = "XLM"
    h.asset_b = "USDC"
    h.reserve_a = 1000
    h.reserve_b = 1000
    h.ratio = ratio
    h.ratio_drift_pct = drift
    h.status = status
    h.last_checked_at = datetime.now(timezone.utc)
    return h


class TestGetPoolHealth:
    @pytest.mark.anyio
    async def test_returns_none_when_no_record(self):
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)

        result = await get_pool_health(db, pool_id=99)
        assert result is None

    @pytest.mark.anyio
    async def test_returns_health_record(self):
        db = AsyncMock()
        health = _make_health(pool_id=1, status="healthy")
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = health
        db.execute = AsyncMock(return_value=result_mock)

        result = await get_pool_health(db, pool_id=1)
        assert result is health
        assert result.status == "healthy"


class TestListPoolHealth:
    @pytest.mark.anyio
    async def test_returns_empty_list(self):
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        result = await list_pool_health(db)
        assert result == []

    @pytest.mark.anyio
    async def test_returns_all_pools(self):
        db = AsyncMock()
        pools = [_make_health(pool_id=i) for i in range(3)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = pools
        db.execute = AsyncMock(return_value=result_mock)

        result = await list_pool_health(db)
        assert len(result) == 3


class TestGetPoolSnapshots:
    @pytest.mark.anyio
    async def test_returns_snapshots(self):
        db = AsyncMock()
        snaps = [_make_snapshot(pool_id=1) for _ in range(5)]
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = snaps
        db.execute = AsyncMock(return_value=result_mock)

        result = await get_pool_snapshots(db, pool_id=1, limit=10)
        assert len(result) == 5

    @pytest.mark.anyio
    async def test_empty_snapshots(self):
        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        result = await get_pool_snapshots(db, pool_id=42, limit=50)
        assert result == []


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------


class TestLiquidityRoutes:
    @pytest.mark.anyio
    async def test_get_pool_health_not_found(self):
        from app.routes.liquidity import get_pool_health as route_get
        from fastapi import HTTPException

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalar_one_or_none.return_value = None
        db.execute = AsyncMock(return_value=result_mock)

        with pytest.raises(HTTPException) as exc_info:
            await route_get(pool_id=999, db=db)
        assert exc_info.value.status_code == 404

    @pytest.mark.anyio
    async def test_list_pool_health_empty(self):
        from app.routes.liquidity import list_pool_health as route_list

        db = AsyncMock()
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = []
        db.execute = AsyncMock(return_value=result_mock)

        summary = await route_list(db=db)
        assert summary.total_pools == 0
        assert summary.healthy == 0
        assert summary.warning == 0
        assert summary.critical == 0

    @pytest.mark.anyio
    async def test_list_pool_health_counts(self):
        from app.routes.liquidity import list_pool_health as route_list
        from app.schemas.pool import PoolHealthResponse

        db = AsyncMock()
        now = datetime.now(timezone.utc)

        def _h(pool_id, status):
            h = MagicMock()
            h.pool_id = pool_id
            h.asset_a = "XLM"
            h.asset_b = "USDC"
            h.reserve_a = 1000
            h.reserve_b = 1000
            h.ratio = 1.0
            h.ratio_drift_pct = 0.0
            h.status = status
            h.last_checked_at = now
            return h

        pools = [_h(1, "healthy"), _h(2, "warning"), _h(3, "critical")]
        result_mock = MagicMock()
        result_mock.scalars.return_value.all.return_value = pools
        db.execute = AsyncMock(return_value=result_mock)

        summary = await route_list(db=db)
        assert summary.total_pools == 3
        assert summary.healthy == 1
        assert summary.warning == 1
        assert summary.critical == 1

    @pytest.mark.anyio
    async def test_create_snapshot_path_body_mismatch(self):
        from app.routes.liquidity import create_snapshot
        from app.schemas.pool import PoolSnapshotCreate
        from fastapi import HTTPException

        db = AsyncMock()
        body = PoolSnapshotCreate(
            pool_id=2, asset_a="XLM", asset_b="USDC", reserve_a=1000, reserve_b=1000
        )

        with pytest.raises(HTTPException) as exc_info:
            await create_snapshot(pool_id=1, body=body, db=db)
        assert exc_info.value.status_code == 422
