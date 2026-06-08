"""Prometheus metrics for liquidity pool health monitoring (#507)."""

from __future__ import annotations

from typing import Optional

from prometheus_client import Gauge

POOL_RESERVE_A = Gauge(
    "chainbridge_pool_reserve_a",
    "Current reserve_a balance of a liquidity pool",
    ["pool_id", "asset_a", "asset_b"],
)

POOL_RESERVE_B = Gauge(
    "chainbridge_pool_reserve_b",
    "Current reserve_b balance of a liquidity pool",
    ["pool_id", "asset_a", "asset_b"],
)

POOL_RATIO = Gauge(
    "chainbridge_pool_ratio",
    "Current reserve_a / reserve_b ratio of a liquidity pool",
    ["pool_id", "asset_a", "asset_b"],
)

# 0 = healthy, 1 = warning, 2 = critical
POOL_HEALTH_STATUS = Gauge(
    "chainbridge_pool_health_status",
    "Health status of a liquidity pool (0=healthy, 1=warning, 2=critical)",
    ["pool_id", "asset_a", "asset_b"],
)

_STATUS_CODES = {"healthy": 0, "warning": 1, "critical": 2}


def update_pool_metrics(
    pool_id: int,
    asset_a: str,
    asset_b: str,
    reserve_a: int,
    reserve_b: int,
    ratio: Optional[float],
    status: str,
) -> None:
    labels = {"pool_id": str(pool_id), "asset_a": asset_a, "asset_b": asset_b}
    POOL_RESERVE_A.labels(**labels).set(reserve_a)
    POOL_RESERVE_B.labels(**labels).set(reserve_b)
    if ratio is not None:
        POOL_RATIO.labels(**labels).set(ratio)
    POOL_HEALTH_STATUS.labels(**labels).set(_STATUS_CODES.get(status, 2))
