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
