"""HTLC endpoints: create, list, claim, refund, status, batch (#26, #59, #71)."""

import uuid
from datetime import datetime, timezone

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis, CacheService
from app.models.htlc import HTLC
from app.schemas.htlc import (
    HTLCBatchCreate,
    HTLCBatchItemResult,
    HTLCBatchResponse,
    HTLCClaim,
    HTLCCreate,
    HTLCResponse,
    HTLCStatusResponse,
    HTLCTimelineEvent,
)
from app.middleware.auth import require_api_key
from app.ws.events import emit_htlc_event, EventType

router = APIRouter()


def _serialize_htlc(htlc: HTLC) -> dict:
    now_ts = int(datetime.now(timezone.utc).timestamp())
    remaining = max(int(htlc.time_lock) - now_ts, 0)
    timeline = [
        HTLCTimelineEvent(
            label="Created",
            timestamp=htlc.created_at.isoformat() if htlc.created_at else None,
            completed=True,
        ),
        HTLCTimelineEvent(
            label="Claim window open",
            timestamp=None,
            completed=htlc.status == "active",
        ),
        HTLCTimelineEvent(
            label="Claimed",
            timestamp=(
                htlc.updated_at.isoformat()
                if htlc.status == "claimed" and htlc.updated_at
                else None
            ),
            completed=htlc.status == "claimed",
        ),
        HTLCTimelineEvent(
            label="Refunded",
            timestamp=(
                htlc.updated_at.isoformat()
                if htlc.status == "refunded" and htlc.updated_at
                else None
            ),
            completed=htlc.status == "refunded",
        ),
    ]
    phase = (
        "claimable"
        if htlc.status == "active" and remaining > 0
        else "refundable" if htlc.status == "active" else htlc.status
    )
    return HTLCStatusResponse(
        id=str(htlc.id),
        onchain_id=htlc.onchain_id,
        sender=htlc.sender,
        receiver=htlc.receiver,
        amount=htlc.amount,
        hash_lock=htlc.hash_lock,
        time_lock=htlc.time_lock,
        status=htlc.status,
        secret=htlc.secret,
        hash_algorithm=htlc.hash_algorithm,
        created_at=htlc.created_at,
        seconds_remaining=remaining,
        can_claim=htlc.status == "active" and remaining > 0,
        can_refund=htlc.status == "active" and remaining == 0,
        phase=phase,
        timeline=timeline,
    ).model_dump()


@router.get("/", response_model=list[HTLCStatusResponse])
async def list_htlcs(
    participant: Annotated[str | None, Query()] = None,
    status: Annotated[str | None, Query()] = None,
    hash_lock: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(HTLC)
    if participant:
        query = query.where(
            (HTLC.sender == participant) | (HTLC.receiver == participant)
        )
    if status:
        query = query.where(HTLC.status == status)
    if hash_lock:
        query = query.where(HTLC.hash_lock == hash_lock)
    query = query.order_by(HTLC.time_lock.asc()).limit(limit).offset(offset)

    result = await db.execute(query)
    htlcs = result.scalars().all()
    return [_serialize_htlc(htlc) for htlc in htlcs]


@router.post("/", response_model=HTLCResponse, status_code=201)
async def create_htlc(
    data: HTLCCreate, db: AsyncSession = Depends(get_db), _=Depends(require_api_key)
):
    htlc = HTLC(
        sender=data.sender,
        receiver=data.receiver,
        amount=data.amount,
        hash_lock=data.hash_lock,
        time_lock=data.time_lock,
        hash_algorithm=data.hash_algorithm,
        status="active",
    )
    db.add(htlc)
    await db.commit()
    await db.refresh(htlc)

    redis = get_redis()
    cache = CacheService(redis)
    await cache.delete(f"htlc:{htlc.id}")

    response = HTLCResponse.model_validate(htlc)
    await emit_htlc_event(redis, EventType.HTLC_CREATED, response.model_dump())
    return response


@router.get("/{htlc_id}", response_model=HTLCStatusResponse)
async def get_htlc(htlc_id: str, db: AsyncSession = Depends(get_db)):
    cache = CacheService(get_redis())
    cached = await cache.get(f"htlc:{htlc_id}")
    if cached:
        return cached

    result = await db.execute(select(HTLC).where(HTLC.id == htlc_id))
    htlc = result.scalar_one_or_none()
    if not htlc:
        raise HTTPException(status_code=404, detail="HTLC not found")

    response = _serialize_htlc(htlc)
    await cache.set(f"htlc:{htlc_id}", response, ttl=60)
    return response


@router.post("/{htlc_id}/claim", response_model=HTLCResponse)
async def claim_htlc(
    htlc_id: str,
    data: HTLCClaim,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(HTLC).where(HTLC.id == htlc_id))
    htlc = result.scalar_one_or_none()
    if not htlc:
        raise HTTPException(status_code=404, detail="HTLC not found")
    if htlc.status != "active":
        raise HTTPException(status_code=400, detail="HTLC is not active")
    if int(htlc.time_lock) <= int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=400, detail="HTLC claim window has expired")

    htlc.status = "claimed"
    htlc.secret = data.secret
    await db.commit()

    redis = get_redis()
    cache = CacheService(redis)
    await cache.delete(f"htlc:{htlc_id}")

    response = HTLCResponse.model_validate(htlc)
    await emit_htlc_event(redis, EventType.HTLC_CLAIMED, response.model_dump())
    return response


@router.post("/{htlc_id}/refund", response_model=HTLCResponse)
async def refund_htlc(
    htlc_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_api_key)
):
    result = await db.execute(select(HTLC).where(HTLC.id == htlc_id))
    htlc = result.scalar_one_or_none()
    if not htlc:
        raise HTTPException(status_code=404, detail="HTLC not found")
    if htlc.status != "active":
        raise HTTPException(status_code=400, detail="HTLC is not active")
    if int(htlc.time_lock) > int(datetime.now(timezone.utc).timestamp()):
        raise HTTPException(status_code=400, detail="HTLC is not refundable yet")

    htlc.status = "refunded"
    await db.commit()

    redis = get_redis()
    cache = CacheService(redis)
    await cache.delete(f"htlc:{htlc_id}")

    response = HTLCResponse.model_validate(htlc)
    await emit_htlc_event(redis, EventType.HTLC_REFUNDED, response.model_dump())
    return response


@router.get("/{htlc_id}/status", response_model=HTLCStatusResponse)
async def get_htlc_status(htlc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(HTLC).where(HTLC.id == htlc_id))
    htlc = result.scalar_one_or_none()
    if not htlc:
        raise HTTPException(status_code=404, detail="HTLC not found")
    return _serialize_htlc(htlc)


@router.post("/batch", response_model=HTLCBatchResponse, status_code=207)
async def create_htlc_batch(
    data: HTLCBatchCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    """Create multiple HTLCs atomically. All succeed or all are rolled back."""
    batch_id = str(uuid.uuid4())
    results: list[HTLCBatchItemResult] = []

    try:
        htlcs: list[tuple[int, HTLC]] = []
        for i, item in enumerate(data.items):
            htlc = HTLC(
                sender=item.sender,
                receiver=item.receiver,
                amount=item.amount,
                hash_lock=item.hash_lock,
                time_lock=item.time_lock,
                hash_algorithm=item.hash_algorithm,
                status="active",
            )
            db.add(htlc)
            htlcs.append((i, htlc))

        await db.commit()

        for i, htlc in htlcs:
            await db.refresh(htlc)
            results.append(
                HTLCBatchItemResult(
                    index=i,
                    success=True,
                    data=HTLCResponse.model_validate(htlc),
                )
            )
    except Exception as exc:
        await db.rollback()
        results = [
            HTLCBatchItemResult(index=i, success=False, error=str(exc))
            for i in range(len(data.items))
        ]

    succeeded = sum(1 for r in results if r.success)
    return HTLCBatchResponse(
        batch_id=batch_id,
        total=len(data.items),
        succeeded=succeeded,
        failed=len(results) - succeeded,
        items=results,
    )
