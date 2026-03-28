"""Order book endpoints: create, list, match, cancel (#26, #59)."""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis, CacheService
from app.models.order import SwapOrder
from app.schemas.order import OrderCreate, OrderResponse, OrderMatch
from app.middleware.auth import require_api_key
from app.services.order_matching import OrderMatchingService
from app.ws.events import emit_order_event, EventType

router = APIRouter()
matching_service = OrderMatchingService()


@router.post("/", response_model=OrderResponse, status_code=201)
async def create_order(
    data: OrderCreate, db: AsyncSession = Depends(get_db), _=Depends(require_api_key)
):
    order = SwapOrder(
        creator=data.creator,
        from_chain=data.from_chain,
        to_chain=data.to_chain,
        from_asset=data.from_asset,
        to_asset=data.to_asset,
        from_amount=data.from_amount,
        to_amount=data.to_amount,
        min_fill_amount=data.min_fill_amount,
        expiry=data.expiry,
        status="open",
    )
    db.add(order)
    await db.commit()
    await db.refresh(order)

    summary = await matching_service.match_order(db, order)
    await db.commit()
    await db.refresh(order)

    redis = get_redis()
    cache = CacheService(redis)
    await cache.invalidate_pattern("orders:*")

    response = OrderResponse.model_validate(order)
    await emit_order_event(redis, EventType.ORDER_CREATED, response.model_dump())
    if summary.total_matches:
        payload = response.model_dump()
        payload["matching_summary"] = summary.to_event_payload()
        await emit_order_event(redis, EventType.ORDER_MATCHED, payload)
    return response


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    from_chain: Annotated[Optional[str], Query()] = None,
    to_chain: Annotated[Optional[str], Query()] = None,
    status: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: AsyncSession = Depends(get_db),
):
    cache_key = f"orders:{from_chain}:{to_chain}:{status}:{limit}:{offset}"
    cache = CacheService(get_redis())
    cached = await cache.get(cache_key)
    if cached:
        return cached

    query = select(SwapOrder)
    if from_chain:
        query = query.where(SwapOrder.from_chain == from_chain)
    if to_chain:
        query = query.where(SwapOrder.to_chain == to_chain)
    if status:
        query = query.where(SwapOrder.status == status)
    query = query.order_by(SwapOrder.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    orders = result.scalars().all()
    response = [OrderResponse.model_validate(o).model_dump() for o in orders]

    await cache.set(cache_key, response, ttl=30)
    return response


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(order_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SwapOrder).where(SwapOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return OrderResponse.model_validate(order)


@router.post("/{order_id}/match", response_model=OrderResponse)
async def match_order(
    order_id: str,
    data: OrderMatch,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(SwapOrder).where(SwapOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "open":
        raise HTTPException(status_code=400, detail="Order is not open")
    if data.fill_amount and data.fill_amount > (
        order.from_amount - int(order.filled_amount or 0)
    ):
        raise HTTPException(
            status_code=400, detail="fill_amount exceeds remaining order size"
        )

    order.counterparty = data.counterparty
    if data.fill_amount:
        order.filled_amount = int(order.filled_amount or 0) + data.fill_amount
    order.status = "filled" if order.filled_amount >= order.from_amount else "matched"
    if data.fill_amount:
        order.filled_amount = int(order.filled_amount)
    await db.commit()

    redis = get_redis()
    cache = CacheService(redis)
    await cache.invalidate_pattern("orders:*")

    response = OrderResponse.model_validate(order)
    await emit_order_event(redis, EventType.ORDER_MATCHED, response.model_dump())
    return response


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: str, db: AsyncSession = Depends(get_db), _=Depends(require_api_key)
):
    result = await db.execute(select(SwapOrder).where(SwapOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "open":
        raise HTTPException(status_code=400, detail="Only open orders can be cancelled")

    order.status = "cancelled"
    await db.commit()

    redis = get_redis()
    cache = CacheService(redis)
    await cache.invalidate_pattern("orders:*")

    response = OrderResponse.model_validate(order)
    await emit_order_event(redis, EventType.ORDER_CANCELLED, response.model_dump())
    return response
