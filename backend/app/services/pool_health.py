"""Pool health and reserve drift monitoring service (#507)."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pool import LiquidityPoolHealth, LiquidityPoolSnapshot
from app.observability.pool_metrics import update_pool_metrics

logger = logging.getLogger(__name__)

# Monitoring window: compare current ratio against the snapshot taken this far back.
DRIFT_WINDOW_HOURS = 24

# Health thresholds — all values are percentages or absolute ratios.
DRIFT_WARN_PCT = 10.0      # ratio changed >10% in the window → warning
DRIFT_CRITICAL_PCT = 30.0  # ratio changed >30% → critical

# A ratio outside [RATIO_LOW, RATIO_HIGH] means one reserve is very thin.
RATIO_WARN_LOW = 0.25
RATIO_WARN_HIGH = 4.0
RATIO_CRITICAL_LOW = 0.1
RATIO_CRITICAL_HIGH = 10.0

# Keep at most this many snapshots per pool to bound table growth.
MAX_SNAPSHOTS_PER_POOL = 500


def _safe_ratio(reserve_a: int, reserve_b: int) -> Optional[float]:
    if reserve_b == 0:
        return None
    return reserve_a / reserve_b


def _classify(
    ratio: Optional[float],
    drift_pct: Optional[float],
) -> str:
    if ratio is None:
        return "critical"

    if ratio < RATIO_CRITICAL_LOW or ratio > RATIO_CRITICAL_HIGH:
        return "critical"
    if drift_pct is not None and abs(drift_pct) >= DRIFT_CRITICAL_PCT:
        return "critical"

    if ratio < RATIO_WARN_LOW or ratio > RATIO_WARN_HIGH:
        return "warning"
    if drift_pct is not None and abs(drift_pct) >= DRIFT_WARN_PCT:
        return "warning"

    return "healthy"


async def record_snapshot(
    db: AsyncSession,
    pool_id: int,
    asset_a: str,
    asset_b: str,
    reserve_a: int,
    reserve_b: int,
) -> LiquidityPoolSnapshot:
    """Persist a new reserve snapshot and refresh the pool's health record."""
    ratio = _safe_ratio(reserve_a, reserve_b)

    snapshot = LiquidityPoolSnapshot(
        pool_id=pool_id,
        asset_a=asset_a,
        asset_b=asset_b,
        reserve_a=reserve_a,
        reserve_b=reserve_b,
        ratio=ratio,
    )
    db.add(snapshot)

    await _prune_old_snapshots(db, pool_id)
    health = await _refresh_health(db, pool_id, asset_a, asset_b, reserve_a, reserve_b, ratio)

    await db.commit()
    await db.refresh(snapshot)

    update_pool_metrics(
        pool_id=pool_id,
        asset_a=asset_a,
        asset_b=asset_b,
        reserve_a=reserve_a,
        reserve_b=reserve_b,
        ratio=ratio,
        status=health.status,
    )

    return snapshot


async def _prune_old_snapshots(db: AsyncSession, pool_id: int) -> None:
    """Delete the oldest snapshots when the per-pool cap is exceeded."""
    count_result = await db.execute(
        select(LiquidityPoolSnapshot).where(LiquidityPoolSnapshot.pool_id == pool_id)
    )
    rows = count_result.scalars().all()
    if len(rows) < MAX_SNAPSHOTS_PER_POOL:
        return

    # Sort ascending by capture time and drop the excess oldest rows.
    oldest = sorted(rows, key=lambda s: s.captured_at)[: len(rows) - MAX_SNAPSHOTS_PER_POOL + 1]
    for row in oldest:
        await db.delete(row)


async def _refresh_health(
    db: AsyncSession,
    pool_id: int,
    asset_a: str,
    asset_b: str,
    reserve_a: int,
    reserve_b: int,
    ratio: Optional[float],
) -> LiquidityPoolHealth:
    """Compute drift and upsert the LiquidityPoolHealth record for pool_id."""
    window_start = datetime.now(timezone.utc) - timedelta(hours=DRIFT_WINDOW_HOURS)

    oldest_result = await db.execute(
        select(LiquidityPoolSnapshot)
        .where(
            LiquidityPoolSnapshot.pool_id == pool_id,
            LiquidityPoolSnapshot.captured_at >= window_start,
        )
        .order_by(LiquidityPoolSnapshot.captured_at.asc())
        .limit(1)
    )
    baseline = oldest_result.scalar_one_or_none()

    drift_pct: Optional[float] = None
    if baseline is not None and baseline.ratio is not None and ratio is not None:
        if baseline.ratio != 0:
            drift_pct = ((ratio - baseline.ratio) / baseline.ratio) * 100.0

    status = _classify(ratio, drift_pct)

    result = await db.execute(
        select(LiquidityPoolHealth).where(LiquidityPoolHealth.pool_id == pool_id)
    )
    health = result.scalar_one_or_none()

    if health is None:
        health = LiquidityPoolHealth(
            pool_id=pool_id,
            asset_a=asset_a,
            asset_b=asset_b,
            reserve_a=reserve_a,
            reserve_b=reserve_b,
            ratio=ratio,
            ratio_drift_pct=drift_pct,
            status=status,
        )
        db.add(health)
    else:
        health.asset_a = asset_a
        health.asset_b = asset_b
        health.reserve_a = reserve_a
        health.reserve_b = reserve_b
        health.ratio = ratio
        health.ratio_drift_pct = drift_pct
        health.status = status

    return health


async def get_pool_health(db: AsyncSession, pool_id: int) -> Optional[LiquidityPoolHealth]:
    result = await db.execute(
        select(LiquidityPoolHealth).where(LiquidityPoolHealth.pool_id == pool_id)
    )
    return result.scalar_one_or_none()


async def list_pool_health(db: AsyncSession) -> list[LiquidityPoolHealth]:
    result = await db.execute(
        select(LiquidityPoolHealth).order_by(LiquidityPoolHealth.pool_id)
    )
    return list(result.scalars().all())


async def get_pool_snapshots(
    db: AsyncSession,
    pool_id: int,
    limit: int = 50,
) -> list[LiquidityPoolSnapshot]:
    result = await db.execute(
        select(LiquidityPoolSnapshot)
        .where(LiquidityPoolSnapshot.pool_id == pool_id)
        .order_by(LiquidityPoolSnapshot.captured_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())
