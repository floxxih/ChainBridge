"""Statistics and analytics endpoints (#26)."""

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis, CacheService
from app.models.htlc import HTLC
from app.models.order import SwapOrder
from app.models.swap import CrossChainSwap

router = APIRouter()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)):
    cache = CacheService(get_redis())
    cached = await cache.get("analytics:stats")
    if cached:
        return cached

    htlc_count = (await db.execute(select(func.count(HTLC.id)))).scalar() or 0
    order_count = (await db.execute(select(func.count(SwapOrder.id)))).scalar() or 0
    swap_count = (await db.execute(select(func.count(CrossChainSwap.id)))).scalar() or 0
    open_orders = (
        await db.execute(
            select(func.count(SwapOrder.id)).where(SwapOrder.status == "open")
        )
    ).scalar() or 0
    total_volume = (
        await db.execute(select(func.coalesce(func.sum(SwapOrder.from_amount), 0)))
    ).scalar() or 0

    stats = {
        "total_htlcs": htlc_count,
        "total_orders": order_count,
        "total_swaps": swap_count,
        "open_orders": open_orders,
        "total_volume": total_volume,
    }

    await cache.set("analytics:stats", stats, ttl=60)
    return stats


@router.get("/swap-analytics/{swap_id}")
async def get_swap_analytics(swap_id: int, db: AsyncSession = Depends(get_db)):
    """Get detailed analytics for a specific swap including routing, fees, and referral data."""
    cache = CacheService(get_redis())
    cache_key = f"analytics:swap:{swap_id}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Get swap details
    swap = await db.get(CrossChainSwap, swap_id)
    if not swap:
        return {
            "swap_id": swap_id,
            "found": False,
            "routing": None,
            "fees": None,
            "referral": None,
        }

    # Get associated order if exists
    order = None
    if swap.order_id:
        order = await db.get(SwapOrder, swap.order_id)

    # Calculate routing information
    routing_data = {
        "source_chain": order.source_chain if order else "unknown",
        "target_chain": order.target_chain if order else "unknown",
        "route_type": "direct",  # Default to direct
        "hops": 1,
        "estimated_time_seconds": 300,  # 5 minutes default
    }

    # Calculate fee breakdown
    fees_data = {
        "network_fee": 0,
        "protocol_fee": 0,
        "total_fee": 0,
        "fee_currency": order.source_asset if order else "unknown",
    }

    if order:
        # Calculate fees based on order amount (example: 0.3% protocol fee)
        protocol_fee_bps = 30  # 0.3%
        fees_data["protocol_fee"] = int(order.from_amount * protocol_fee_bps / 10000)
        fees_data["network_fee"] = 1000  # Placeholder network fee
        fees_data["total_fee"] = fees_data["protocol_fee"] + fees_data["network_fee"]

    # Get referral information if any
    referral_data = None
    # TODO: Query referral table when implemented
    # For now, return None if no referral

    analytics = {
        "swap_id": swap_id,
        "found": True,
        "routing": routing_data,
        "fees": fees_data,
        "referral": referral_data,
        "status": swap.state,
        "created_at": swap.created_at.isoformat() if hasattr(swap, 'created_at') else None,
    }

    await cache.set(cache_key, analytics, ttl=300)  # Cache for 5 minutes
    return analytics


@router.get("/protocol-metrics")
async def get_protocol_metrics(db: AsyncSession = Depends(get_db)):
    """Get live protocol metrics for dashboard and swap flows."""
    cache = CacheService(get_redis())
    cached = await cache.get("analytics:protocol_metrics")
    if cached:
        return cached

    # Total value locked (TVL) - sum of all active HTLCs
    active_htlcs = await db.execute(
        select(func.coalesce(func.sum(HTLC.amount), 0)).where(HTLC.status == "active")
    )
    tvl = active_htlcs.scalar() or 0

    # Trading volume (last 24h)
    from datetime import datetime, timedelta
    yesterday = datetime.utcnow() - timedelta(days=1)
    volume_24h = (
        await db.execute(
            select(func.coalesce(func.sum(SwapOrder.from_amount), 0))
            .where(SwapOrder.created_at >= yesterday)
        )
    ).scalar() or 0

    # Active users (unique creators in last 24h)
    active_users = (
        await db.execute(
            select(func.count(func.distinct(SwapOrder.creator_address)))
            .where(SwapOrder.created_at >= yesterday)
        )
    ).scalar() or 0

    # Average swap time
    completed_swaps = await db.execute(
        select(CrossChainSwap)
        .where(CrossChainSwap.state == "completed")
        .order_by(CrossChainSwap.id.desc())
        .limit(100)
    )
    swaps_list = completed_swaps.scalars().all()
    avg_swap_time = 450  # Default 7.5 minutes

    if swaps_list:
        # Calculate average completion time
        times = []
        for swap in swaps_list:
            if hasattr(swap, 'created_at') and hasattr(swap, 'updated_at'):
                time_diff = (swap.updated_at - swap.created_at).total_seconds()
                times.append(time_diff)
        if times:
            avg_swap_time = int(sum(times) / len(times))

    metrics = {
        "tvl": tvl,
        "volume_24h": volume_24h,
        "active_users_24h": active_users,
        "average_swap_time_seconds": avg_swap_time,
        "total_swaps": (await db.execute(select(func.count(CrossChainSwap.id)))).scalar() or 0,
        "success_rate": 0.95,  # Placeholder - calculate from actual data
        "timestamp": datetime.utcnow().isoformat(),
    }

    await cache.set("analytics:protocol_metrics", metrics, ttl=120)  # Cache for 2 minutes
    return metrics


@router.get("/routing-analytics")
async def get_routing_analytics(
    source_chain: str,
    target_chain: str,
    db: AsyncSession = Depends(get_db)
):
    """Get routing analytics for a specific chain pair."""
    cache = CacheService(get_redis())
    cache_key = f"analytics:routing:{source_chain}:{target_chain}"
    cached = await cache.get(cache_key)
    if cached:
        return cached

    # Count swaps for this route
    route_count = (
        await db.execute(
            select(func.count(SwapOrder.id))
            .where(SwapOrder.source_chain == source_chain)
            .where(SwapOrder.target_chain == target_chain)
        )
    ).scalar() or 0

    # Calculate average completion time for this route
    recent_orders = await db.execute(
        select(SwapOrder)
        .where(SwapOrder.source_chain == source_chain)
        .where(SwapOrder.target_chain == target_chain)
        .where(SwapOrder.status.in_(["matched", "completed"]))
        .order_by(SwapOrder.created_at.desc())
        .limit(50)
    )
    orders_list = recent_orders.scalars().all()

    avg_time = 300  # Default 5 minutes
    if orders_list:
        # Estimate based on chain types
        if source_chain == "ethereum" or target_chain == "ethereum":
            avg_time = 600  # 10 minutes for Ethereum
        elif source_chain == "bitcoin" or target_chain == "bitcoin":
            avg_time = 900  # 15 minutes for Bitcoin
        else:
            avg_time = 180  # 3 minutes for fast chains

    analytics = {
        "source_chain": source_chain,
        "target_chain": target_chain,
        "total_swaps": route_count,
        "average_time_seconds": avg_time,
        "available": route_count > 0 or True,  # Always show as available
        "liquidity_depth": "high" if route_count > 100 else "medium" if route_count > 10 else "low",
    }

    await cache.set(cache_key, analytics, ttl=300)
    return analytics
