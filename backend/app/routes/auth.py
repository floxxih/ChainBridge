"""API key management and JWT token endpoints (#27)."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.models.api_key import APIKey
from app.schemas.auth import APIKeyCreate, APIKeyResponse, TokenResponse
from app.middleware.auth import generate_api_key, create_jwt_token, require_api_key

router = APIRouter()


@router.post("/api-keys", response_model=APIKeyResponse, status_code=201)
async def create_api_key(data: APIKeyCreate, db: AsyncSession = Depends(get_db)):
    key = APIKey(
        key=generate_api_key(),
        name=data.name,
        owner=data.owner,
        is_admin=data.is_admin,
    )
    db.add(key)
    await db.commit()
    await db.refresh(key)
    return APIKeyResponse.model_validate(key)


@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(
    owner: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(APIKey).where(APIKey.owner == owner))
    keys = result.scalars().all()
    return [APIKeyResponse.model_validate(k) for k in keys]


@router.delete("/api-keys/{key_id}")
async def revoke_api_key(
    key_id: str,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    await db.commit()
    return {"status": "revoked"}


@router.post("/token", response_model=TokenResponse)
async def generate_token(
    _=Depends(require_api_key),
):
    """Exchange a valid API key for a short-lived JWT token."""
    token_data = create_jwt_token(subject="api-user")
    return TokenResponse(**token_data)
