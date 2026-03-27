"""
Admin dashboard endpoints (#60).

All routes require an admin API key (is_admin=True).
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis, CacheService
from app.middleware.auth import require_admin_key
from app.models.api_key import APIKey
from app.models.dispute import SwapDispute
from app.models.htlc import HTLC
from app.models.order import SwapOrder
from app.models.swap import CrossChainSwap
from app.schemas.dispute import DisputeResolve, DisputeResponse, DisputeReview

router = APIRouter()

_ALERTS_KEY = "admin:alerts"


def _append_dispute_action(
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


# ── Schemas ──────────────────────────────────────────────────────────────────


class AlertCreate(BaseModel):
    name: str
    metric: str  # e.g. "active_htlcs", "open_orders", "swap_volume"
    condition: str  # "gt" | "lt" | "eq"
    threshold: float
    severity: str = "warning"  # "info" | "warning" | "critical"
    enabled: bool = True


class AlertResponse(AlertCreate):
    id: str
    created_at: str


# ── Protocol Overview ─────────────────────────────────────────────────────────


@router.get("/stats")
async def admin_stats(
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    """Comprehensive protocol statistics for the admin overview."""
    cache = CacheService(get_redis())
    cached = await cache.get("admin:stats")
    if cached:
        return cached

    # Counts
    total_htlcs = (await db.execute(select(func.count(HTLC.id)))).scalar() or 0
    active_htlcs = (
        await db.execute(select(func.count(HTLC.id)).where(HTLC.status == "active"))
    ).scalar() or 0
    claimed_htlcs = (
        await db.execute(select(func.count(HTLC.id)).where(HTLC.status == "claimed"))
    ).scalar() or 0
    refunded_htlcs = (
        await db.execute(select(func.count(HTLC.id)).where(HTLC.status == "refunded"))
    ).scalar() or 0

    total_orders = (await db.execute(select(func.count(SwapOrder.id)))).scalar() or 0
    open_orders = (
        await db.execute(
            select(func.count(SwapOrder.id)).where(SwapOrder.status == "open")
        )
    ).scalar() or 0
    matched_orders = (
        await db.execute(
            select(func.count(SwapOrder.id)).where(SwapOrder.status == "matched")
        )
    ).scalar() or 0
    cancelled_orders = (
        await db.execute(
            select(func.count(SwapOrder.id)).where(SwapOrder.status == "cancelled")
        )
    ).scalar() or 0

    total_swaps = (
        await db.execute(select(func.count(CrossChainSwap.id)))
    ).scalar() or 0
    executed_swaps = (
        await db.execute(
            select(func.count(CrossChainSwap.id)).where(
                CrossChainSwap.state == "executed"
            )
        )
    ).scalar() or 0

    total_disputes = (
        await db.execute(select(func.count(SwapDispute.id)))
    ).scalar() or 0
    open_disputes = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(
                SwapDispute.status.in_(["submitted", "in_review"])
            )
        )
    ).scalar() or 0
    resolved_disputes = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "resolved")
        )
    ).scalar() or 0

    total_volume = (
        await db.execute(select(func.coalesce(func.sum(SwapOrder.from_amount), 0)))
    ).scalar() or 0
    volume_24h_result = await db.execute(
        select(func.coalesce(func.sum(SwapOrder.from_amount), 0)).where(
            SwapOrder.created_at >= datetime.now(timezone.utc) - timedelta(hours=24)
        )
    )
    volume_24h = volume_24h_result.scalar() or 0

    # Unique users (distinct creator addresses)
    unique_users = (
        await db.execute(select(func.count(func.distinct(SwapOrder.creator))))
    ).scalar() or 0

    # Active API keys
    active_api_keys = (
        await db.execute(select(func.count(APIKey.id)).where(APIKey.is_active == True))
    ).scalar() or 0

    stats = {
        "htlcs": {
            "total": total_htlcs,
            "active": active_htlcs,
            "claimed": claimed_htlcs,
            "refunded": refunded_htlcs,
        },
        "orders": {
            "total": total_orders,
            "open": open_orders,
            "matched": matched_orders,
            "cancelled": cancelled_orders,
        },
        "swaps": {
            "total": total_swaps,
            "executed": executed_swaps,
        },
        "disputes": {
            "total": total_disputes,
            "open": open_disputes,
            "resolved": resolved_disputes,
        },
        "volume": {
            "total": int(total_volume),
            "last_24h": int(volume_24h),
        },
        "users": {
            "unique_creators": unique_users,
            "active_api_keys": active_api_keys,
        },
    }

    await cache.set("admin:stats", stats, ttl=30)
    return stats


# ── Swap Volume Time Series ───────────────────────────────────────────────────


@router.get("/volume")
async def admin_volume(
    period: str = Query("24h", pattern="^(1h|24h|7d|30d)$"),
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    """
    Return time-bucketed swap volume suitable for chart rendering.

    period: 1h (5-min buckets) | 24h (hourly) | 7d (daily) | 30d (daily)
    """
    cache = CacheService(get_redis())
    cache_key = f"admin:volume:{period}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    period_map = {
        "1h": ("5 minutes", timedelta(hours=1)),
        "24h": ("1 hour", timedelta(hours=24)),
        "7d": ("1 day", timedelta(days=7)),
        "30d": ("1 day", timedelta(days=30)),
    }
    bucket_interval, lookback = period_map[period]

    since = datetime.now(timezone.utc) - lookback

    # Use raw SQL for date_trunc portability
    result = await db.execute(
        text("""
            SELECT
                date_trunc(:interval, created_at) AS bucket,
                COALESCE(SUM(from_amount), 0)     AS volume,
                COUNT(*)                           AS order_count
            FROM swap_orders
            WHERE created_at >= :since
            GROUP BY bucket
            ORDER BY bucket
        """),
        {"interval": bucket_interval, "since": since},
    )
    rows = result.fetchall()

    data = [
        {
            "timestamp": row.bucket.isoformat() if row.bucket else None,
            "volume": int(row.volume),
            "order_count": int(row.order_count),
        }
        for row in rows
    ]

    await cache.set(cache_key, {"period": period, "buckets": data}, ttl=60)
    return {"period": period, "buckets": data}


# ── Active HTLC Monitoring ────────────────────────────────────────────────────


@router.get("/htlcs/active")
async def admin_active_htlcs(
    limit: int = Query(50, le=200),
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    """Return all active HTLCs with time-lock expiry urgency."""
    result = await db.execute(
        select(HTLC)
        .where(HTLC.status == "active")
        .order_by(HTLC.time_lock.asc())
        .limit(limit)
    )
    htlcs = result.scalars().all()
    now_ts = int(datetime.now(timezone.utc).timestamp())

    rows = []
    for h in htlcs:
        remaining = int(h.time_lock) - now_ts
        urgency = (
            "critical"
            if remaining < 3600
            else "warning" if remaining < 86400 else "normal"
        )
        rows.append(
            {
                "id": str(h.id),
                "onchain_id": h.onchain_id,
                "sender": h.sender,
                "receiver": h.receiver,
                "amount": h.amount,
                "hash_lock": h.hash_lock,
                "time_lock": h.time_lock,
                "seconds_remaining": max(remaining, 0),
                "urgency": urgency,
                "hash_algorithm": h.hash_algorithm,
                "created_at": h.created_at.isoformat() if h.created_at else None,
            }
        )

    return {"active_count": len(rows), "htlcs": rows}


# ── Chain Health ──────────────────────────────────────────────────────────────


@router.get("/chains")
async def admin_chain_health(
    _: APIKey = Depends(require_admin_key),
):
    """
    Return health indicators for each supported chain.
    Derives status from indexer status stored in Redis (set by indexers),
    with a static fallback when no data is available.
    """
    redis = get_redis()
    cache = CacheService(redis)

    chains = ["stellar", "ethereum", "bitcoin"]
    results = []
    for chain in chains:
        status_data = await cache.get(f"indexer:status:{chain}")
        if status_data:
            is_running = status_data.get("is_running", False)
            last_synced = status_data.get("last_synced_block", 0)
            latest = status_data.get("latest_chain_block", 0)
            blocks_behind = status_data.get("blocks_behind", 0)
            health = (
                "healthy"
                if is_running and blocks_behind < 10
                else ("degraded" if blocks_behind < 50 else "unhealthy")
            )
            results.append(
                {
                    "chain": chain,
                    "health": health,
                    "is_running": is_running,
                    "last_synced_block": last_synced,
                    "latest_block": latest,
                    "blocks_behind": blocks_behind,
                    "last_updated": status_data.get("last_updated"),
                }
            )
        else:
            # No indexer data — report as unknown
            results.append(
                {
                    "chain": chain,
                    "health": "unknown",
                    "is_running": False,
                    "last_synced_block": None,
                    "latest_block": None,
                    "blocks_behind": None,
                    "last_updated": None,
                }
            )

    return {"chains": results}


# ── User Activity Metrics ─────────────────────────────────────────────────────


@router.get("/users")
async def admin_user_activity(
    limit: int = Query(20, le=100),
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    """Return user activity: top traders by order count and total volume."""
    cache = CacheService(get_redis())
    cached = await cache.get("admin:users")
    if cached:
        return cached

    # Top traders by order count
    top_by_count_result = await db.execute(
        select(
            SwapOrder.creator,
            func.count(SwapOrder.id).label("order_count"),
            func.coalesce(func.sum(SwapOrder.from_amount), 0).label("total_volume"),
        )
        .group_by(SwapOrder.creator)
        .order_by(func.count(SwapOrder.id).desc())
        .limit(limit)
    )
    top_traders = [
        {
            "creator": row.creator,
            "order_count": row.order_count,
            "total_volume": int(row.total_volume),
        }
        for row in top_by_count_result.fetchall()
    ]

    # Orders per chain pair
    chain_pairs_result = await db.execute(
        select(
            SwapOrder.from_chain,
            SwapOrder.to_chain,
            func.count(SwapOrder.id).label("count"),
            func.coalesce(func.sum(SwapOrder.from_amount), 0).label("volume"),
        )
        .group_by(SwapOrder.from_chain, SwapOrder.to_chain)
        .order_by(func.count(SwapOrder.id).desc())
    )
    chain_pairs = [
        {
            "from_chain": row.from_chain,
            "to_chain": row.to_chain,
            "count": row.count,
            "volume": int(row.volume),
        }
        for row in chain_pairs_result.fetchall()
    ]

    # Recent activity (last 7 days, daily buckets)
    since_7d = datetime.now(timezone.utc) - timedelta(days=7)
    activity_result = await db.execute(
        text("""
            SELECT date_trunc('day', created_at) AS day,
                   COUNT(*) AS new_orders,
                   COUNT(DISTINCT creator) AS unique_users
            FROM swap_orders
            WHERE created_at >= :since
            GROUP BY day
            ORDER BY day
        """),
        {"since": since_7d},
    )
    daily_activity = [
        {
            "day": row.day.isoformat() if row.day else None,
            "new_orders": int(row.new_orders),
            "unique_users": int(row.unique_users),
        }
        for row in activity_result.fetchall()
    ]

    response = {
        "top_traders": top_traders,
        "chain_pairs": chain_pairs,
        "daily_activity": daily_activity,
    }
    await cache.set("admin:users", response, ttl=120)
    return response


# ── Alert Configuration ───────────────────────────────────────────────────────


@router.get("/alerts", response_model=list[AlertResponse])
async def list_alerts(_: APIKey = Depends(require_admin_key)):
    """List all configured monitoring alerts."""
    redis = get_redis()
    raw = await redis.hgetall(_ALERTS_KEY)
    alerts = []
    for value in raw.values():
        try:
            alerts.append(json.loads(value))
        except json.JSONDecodeError:
            pass
    alerts.sort(key=lambda a: a.get("created_at", ""))
    return alerts


@router.post("/alerts", response_model=AlertResponse, status_code=201)
async def create_alert(
    data: AlertCreate,
    _: APIKey = Depends(require_admin_key),
):
    """Create a new monitoring alert."""
    alert_id = str(uuid.uuid4())
    alert = AlertResponse(
        **data.model_dump(),
        id=alert_id,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    redis = get_redis()
    await redis.hset(_ALERTS_KEY, alert_id, alert.model_dump_json())
    return alert


@router.patch("/alerts/{alert_id}", response_model=AlertResponse)
async def update_alert(
    alert_id: str,
    data: AlertCreate,
    _: APIKey = Depends(require_admin_key),
):
    """Update an existing alert."""
    redis = get_redis()
    raw = await redis.hget(_ALERTS_KEY, alert_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Alert not found")
    existing = json.loads(raw)
    updated = AlertResponse(
        **data.model_dump(),
        id=alert_id,
        created_at=existing.get("created_at", datetime.now(timezone.utc).isoformat()),
    )
    await redis.hset(_ALERTS_KEY, alert_id, updated.model_dump_json())
    return updated


@router.delete("/alerts/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: str,
    _: APIKey = Depends(require_admin_key),
):
    """Delete a monitoring alert."""
    redis = get_redis()
    deleted = await redis.hdel(_ALERTS_KEY, alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")


# ── Dispute Review Workflow (#62) ───────────────────────────────────────────


@router.get("/disputes", response_model=list[DisputeResponse])
async def admin_list_disputes(
    status: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    query = select(SwapDispute)
    if status:
        query = query.where(SwapDispute.status == status)
    query = query.order_by(SwapDispute.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    disputes = result.scalars().all()
    return [DisputeResponse.model_validate(d) for d in disputes]


@router.get("/disputes/stats")
async def admin_dispute_stats(
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    cache = CacheService(get_redis())
    cached = await cache.get("admin:disputes:stats")
    if cached:
        return cached

    total = (await db.execute(select(func.count(SwapDispute.id)))).scalar() or 0
    submitted = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "submitted")
        )
    ).scalar() or 0
    in_review = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "in_review")
        )
    ).scalar() or 0
    resolved = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "resolved")
        )
    ).scalar() or 0
    rejected = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "rejected")
        )
    ).scalar() or 0
    refunded = (
        await db.execute(
            select(func.count(SwapDispute.id)).where(SwapDispute.status == "refunded")
        )
    ).scalar() or 0

    response = {
        "total": total,
        "submitted": submitted,
        "in_review": in_review,
        "resolved": resolved,
        "rejected": rejected,
        "refunded": refunded,
    }

    await cache.set("admin:disputes:stats", response, ttl=30)
    return response


@router.post("/disputes/{dispute_id}/review", response_model=DisputeResponse)
async def admin_review_dispute(
    dispute_id: str,
    data: DisputeReview,
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    try:
        dispute_uuid = uuid.UUID(dispute_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dispute_id")

    result = await db.execute(select(SwapDispute).where(SwapDispute.id == dispute_uuid))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = "in_review"
    dispute.admin_notes = data.admin_notes
    dispute.reviewed_by = data.reviewed_by
    dispute.reviewed_at = datetime.now(timezone.utc)

    _append_dispute_action(
        dispute,
        action="dispute.review_started",
        actor=data.reviewed_by,
        details={"notes": data.admin_notes},
    )

    await db.commit()
    await db.refresh(dispute)

    cache = CacheService(get_redis())
    await cache.delete("admin:stats")
    await cache.delete("admin:disputes:stats")

    return DisputeResponse.model_validate(dispute)


@router.post("/disputes/{dispute_id}/resolve", response_model=DisputeResponse)
async def admin_resolve_dispute(
    dispute_id: str,
    data: DisputeResolve,
    db: AsyncSession = Depends(get_db),
    _: APIKey = Depends(require_admin_key),
):
    try:
        dispute_uuid = uuid.UUID(dispute_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid dispute_id")

    result = await db.execute(select(SwapDispute).where(SwapDispute.id == dispute_uuid))
    dispute = result.scalar_one_or_none()
    if not dispute:
        raise HTTPException(status_code=404, detail="Dispute not found")

    dispute.status = data.status
    dispute.resolution_action = data.resolution_action
    dispute.resolution = data.resolution
    dispute.admin_notes = data.admin_notes or dispute.admin_notes
    dispute.refund_override = data.refund_override
    dispute.refund_amount = data.refund_amount
    dispute.resolved_by = data.resolved_by
    dispute.resolved_at = datetime.now(timezone.utc)

    # Optional swap state override when a refund is explicitly approved.
    if data.refund_override:
        swap_result = await db.execute(
            select(CrossChainSwap).where(CrossChainSwap.id == dispute.swap_id)
        )
        swap = swap_result.scalar_one_or_none()
        if swap:
            swap.state = "refunded"

    _append_dispute_action(
        dispute,
        action="dispute.resolved",
        actor=data.resolved_by,
        details={
            "status": data.status,
            "resolution_action": data.resolution_action,
            "refund_override": data.refund_override,
            "refund_amount": data.refund_amount,
        },
    )

    await db.commit()
    await db.refresh(dispute)

    cache = CacheService(get_redis())
    await cache.delete("admin:stats")
    await cache.delete("admin:disputes:stats")

    return DisputeResponse.model_validate(dispute)
