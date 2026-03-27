"""Dispute submission and tracking endpoints (#62)."""

from datetime import datetime, timezone
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import CacheService, get_redis
from app.middleware.auth import require_api_key
from app.models.dispute import SwapDispute
from app.models.swap import CrossChainSwap
from app.schemas.dispute import DisputeCreate, DisputeEvidenceCreate, DisputeResponse

router = APIRouter()


def _append_action(
    dispute: SwapDispute, *, action: str, actor: str, details: Optional[dict] = None
) -> None:
    entry = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "action": action,
        "actor": actor,
        "details": details or {},
    }
    existing = list(dispute.action_log or [])
    dispute.action_log = [*existing, entry]


@router.post("/", response_model=DisputeResponse, status_code=201)
async def create_dispute(
    data: DisputeCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    swap_uuid = None
    try:
        swap_uuid = uuid.UUID(data.swap_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid swap_id")

    swap_result = await db.execute(
        select(CrossChainSwap).where(CrossChainSwap.id == swap_uuid)
    )
    swap = swap_result.scalar_one_or_none()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")

    dispute = SwapDispute(
        swap_id=swap_uuid,
        submitted_by=data.submitted_by,
        category=data.category,
        reason=data.reason,
        priority=data.priority,
        evidence=[item.model_dump() for item in data.evidence],
        status="submitted",
    )
    _append_action(
        dispute,
        action="dispute.submitted",
        actor=data.submitted_by,
        details={"category": data.category},
    )

    db.add(dispute)
    await db.commit()
    await db.refresh(dispute)

    cache = CacheService(get_redis())
    await cache.delete("admin:disputes:stats")

    return DisputeResponse.model_validate(dispute)


@router.get("/", response_model=list[DisputeResponse])
async def list_disputes(
    status: Optional[str] = Query(None),
    submitted_by: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    query = select(SwapDispute)
    if status:
        query = query.where(SwapDispute.status == status)
    if submitted_by:
        query = query.where(SwapDispute.submitted_by == submitted_by)

    query = query.order_by(SwapDispute.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    disputes = result.scalars().all()
    return [DisputeResponse.model_validate(d) for d in disputes]


@router.get("/{dispute_id}", response_model=DisputeResponse)
async def get_dispute(
    dispute_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    try:
        dispute_uuid = uuid.UUID(dispute_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dispute_id")

    result = await db.execute(select(SwapDispute).where(SwapDispute.id == dispute_uuid))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    return DisputeResponse.model_validate(dispute)


@router.post("/{dispute_id}/evidence", response_model=DisputeResponse)
async def add_evidence(
    dispute_id: str,
    data: DisputeEvidenceCreate,
    actor: str = Query(..., description="Address/identifier of the evidence submitter"),
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    try:
        dispute_uuid = uuid.UUID(dispute_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dispute_id")

    result = await db.execute(select(SwapDispute).where(SwapDispute.id == dispute_uuid))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    existing_evidence = list(dispute.evidence or [])
    new_items = [item.model_dump() for item in data.evidence]
    dispute.evidence = [*existing_evidence, *new_items]

    _append_action(
        dispute,
        action="dispute.evidence_added",
        actor=actor,
        details={"count": len(new_items)},
    )

    await db.commit()
    await db.refresh(dispute)

    cache = CacheService(get_redis())
    await cache.delete("admin:disputes:stats")

    return DisputeResponse.model_validate(dispute)
