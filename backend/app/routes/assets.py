"""Asset metadata and token registry endpoints."""

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.models.asset import Asset
from app.schemas.asset import AssetResponse, AssetCreate, AssetUpdate
from app.middleware.auth import require_api_key

router = APIRouter()


@router.get("/", response_model=list[AssetResponse])
async def list_assets(
    chain: Annotated[Optional[str], Query()] = None,
    symbol: Annotated[Optional[str], Query()] = None,
    verified: Annotated[Optional[bool], Query()] = None,
    active: Annotated[Optional[bool], Query()] = True,
    search: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Asset)
    if chain:
        query = query.where(Asset.chain == chain)
    if symbol:
        query = query.where(Asset.symbol.ilike(f"%{symbol}%"))
    if verified is not None:
        query = query.where(Asset.is_verified == verified)
    if active is not None:
        query = query.where(Asset.is_active == active)
    if search:
        query = query.where(
            or_(
                Asset.symbol.ilike(f"%{search}%"),
                Asset.name.ilike(f"%{search}%"),
                Asset.description.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(Asset.symbol).limit(limit).offset(offset)

    result = await db.execute(query)
    assets = result.scalars().all()
    return [AssetResponse.model_validate(a) for a in assets]


@router.get("/{asset_id}", response_model=AssetResponse)
async def get_asset(asset_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return AssetResponse.model_validate(asset)


@router.post("/", response_model=AssetResponse)
async def create_asset(
    asset: AssetCreate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    # Check for duplicate
    existing = await db.execute(
        select(Asset).where(
            Asset.chain == asset.chain,
            Asset.address == asset.address,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Asset already exists")

    new_asset = Asset(**asset.model_dump())
    db.add(new_asset)
    await db.commit()
    await db.refresh(new_asset)
    return AssetResponse.model_validate(new_asset)


@router.put("/{asset_id}", response_model=AssetResponse)
async def update_asset(
    asset_id: str,
    asset_update: AssetUpdate,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    for key, value in asset_update.model_dump(exclude_unset=True).items():
        setattr(asset, key, value)

    await db.commit()
    await db.refresh(asset)
    return AssetResponse.model_validate(asset)


@router.delete("/{asset_id}")
async def delete_asset(
    asset_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(Asset).where(Asset.id == asset_id))
    asset = result.scalar_one_or_none()
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    await db.delete(asset)
    await db.commit()
    return {"message": "Asset deleted"}