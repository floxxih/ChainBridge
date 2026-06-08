"""Liquidity pool health and reserve drift monitoring endpoints (#507)."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth import require_api_key
from app.schemas.pool import (
    PoolHealthResponse,
    PoolHealthSummary,
    PoolSnapshotCreate,
    PoolSnapshotResponse,
)
from app.services import pool_health as svc

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post(
    "/pools/{pool_id}/snapshots",
    response_model=PoolSnapshotResponse,
    status_code=201,
    summary="Record a pool reserve snapshot",
)
async def create_snapshot(
    pool_id: int,
    body: PoolSnapshotCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    """Ingest current reserve figures for a pool and refresh its health record."""
    if body.pool_id != pool_id:
        raise HTTPException(
            status_code=422,
            detail="pool_id in path and body must match",
        )
    snapshot = await svc.record_snapshot(
        db=db,
        pool_id=pool_id,
        asset_a=body.asset_a,
        asset_b=body.asset_b,
        reserve_a=body.reserve_a,
        reserve_b=body.reserve_b,
    )
    return PoolSnapshotResponse(
        id=str(snapshot.id),
        pool_id=snapshot.pool_id,
        asset_a=snapshot.asset_a,
        asset_b=snapshot.asset_b,
        reserve_a=snapshot.reserve_a,
        reserve_b=snapshot.reserve_b,
        ratio=snapshot.ratio,
        captured_at=snapshot.captured_at,
    )


@router.get(
    "/pools/{pool_id}/snapshots",
    response_model=list[PoolSnapshotResponse],
    summary="List recent reserve snapshots for a pool",
)
async def list_snapshots(
    pool_id: int,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    db: AsyncSession = Depends(get_db),
):
    rows = await svc.get_pool_snapshots(db=db, pool_id=pool_id, limit=limit)
    return [
        PoolSnapshotResponse(
            id=str(s.id),
            pool_id=s.pool_id,
            asset_a=s.asset_a,
            asset_b=s.asset_b,
            reserve_a=s.reserve_a,
            reserve_b=s.reserve_b,
            ratio=s.ratio,
            captured_at=s.captured_at,
        )
        for s in rows
    ]


@router.get(
    "/pools/{pool_id}/health",
    response_model=PoolHealthResponse,
    summary="Get health status for a single pool",
)
async def get_pool_health(pool_id: int, db: AsyncSession = Depends(get_db)):
    health = await svc.get_pool_health(db=db, pool_id=pool_id)
    if health is None:
        raise HTTPException(status_code=404, detail="No health data for this pool")
    return PoolHealthResponse.model_validate(health)


@router.get(
    "/pools/health",
    response_model=PoolHealthSummary,
    summary="List health status for all monitored pools",
)
async def list_pool_health(db: AsyncSession = Depends(get_db)):
    pools = await svc.list_pool_health(db=db)
    validated = [PoolHealthResponse.model_validate(p) for p in pools]
    return PoolHealthSummary(
        total_pools=len(validated),
        healthy=sum(1 for p in validated if p.status == "healthy"),
        warning=sum(1 for p in validated if p.status == "warning"),
        critical=sum(1 for p in validated if p.status == "critical"),
        pools=validated,
    )
