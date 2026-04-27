"""Chain configuration management endpoints (#64)."""

import time
from typing import Annotated, Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.middleware.auth import require_admin_key
from app.models.chain import ChainConfig
from app.schemas.chain import (
    ChainConfigCreate,
    ChainConfigUpdate,
    ChainConfigResponse,
    ChainHealthResponse,
)

router = APIRouter()


@router.get("/", response_model=list[ChainConfigResponse])
async def list_chains(
    network: Annotated[Optional[str], Query()] = None,
    enabled_only: Annotated[bool, Query()] = False,
    db: AsyncSession = Depends(get_db),
):
    query = select(ChainConfig)
    if network:
        query = query.where(ChainConfig.network == network)
    if enabled_only:
        query = query.where(ChainConfig.is_enabled == True)  # noqa: E712
    result = await db.execute(query.order_by(ChainConfig.chain_name))
    return [ChainConfigResponse.model_validate(c) for c in result.scalars().all()]


@router.post("/", response_model=ChainConfigResponse, status_code=201)
async def create_chain(
    data: ChainConfigCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_key),
):
    existing = await db.execute(
        select(ChainConfig).where(ChainConfig.chain_id == data.chain_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Chain ID already exists")

    chain = ChainConfig(**data.model_dump())
    db.add(chain)
    await db.commit()
    await db.refresh(chain)
    return ChainConfigResponse.model_validate(chain)


@router.get("/{chain_id}", response_model=ChainConfigResponse)
async def get_chain(chain_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChainConfig).where(ChainConfig.chain_id == chain_id)
    )
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")
    return ChainConfigResponse.model_validate(chain)


@router.put("/{chain_id}", response_model=ChainConfigResponse)
async def update_chain(
    chain_id: str,
    data: ChainConfigUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_key),
):
    result = await db.execute(
        select(ChainConfig).where(ChainConfig.chain_id == chain_id)
    )
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(chain, field, value)
    await db.commit()
    await db.refresh(chain)
    return ChainConfigResponse.model_validate(chain)


@router.delete("/{chain_id}", status_code=204)
async def delete_chain(
    chain_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_admin_key),
):
    result = await db.execute(
        select(ChainConfig).where(ChainConfig.chain_id == chain_id)
    )
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")
    await db.delete(chain)
    await db.commit()


@router.get("/{chain_id}/health", response_model=ChainHealthResponse)
async def check_chain_health(chain_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(ChainConfig).where(ChainConfig.chain_id == chain_id)
    )
    chain = result.scalar_one_or_none()
    if not chain:
        raise HTTPException(status_code=404, detail="Chain not found")

    if not chain.explorer_url and not chain.rpc_url:
        return ChainHealthResponse(
            chain_id=chain_id,
            status=chain.status,
            reachable=False,
            message="No health endpoint configured",
        )

    url = chain.rpc_url or chain.explorer_url
    start = time.monotonic()
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.get(url)
        latency_ms = (time.monotonic() - start) * 1000
        new_status = "active"
        reachable = True
        message = None
    except Exception as exc:
        latency_ms = None
        new_status = "offline"
        reachable = False
        message = str(exc)

    chain.status = new_status
    await db.commit()

    return ChainHealthResponse(
        chain_id=chain_id,
        status=new_status,
        reachable=reachable,
        latency_ms=latency_ms,
        message=message,
    )
