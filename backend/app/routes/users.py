from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel
from typing import Optional

from app.config.database import get_db
from app.models.user import User

router = APIRouter()

class UserCreate(BaseModel):
    wallet_address: str
    display_name: str | None = None
    preferred_chain: str | None = None
    email: str | None = None
    notifications_enabled: bool = True
    theme: str = "dark"

class UserResponse(UserCreate):
    id: str
    is_active: bool

@router.post("/users", response_model=UserResponse)
async def create_or_update_user(data: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.wallet_address == data.wallet_address))
    user = result.scalar_one_or_none()
    
    if not user:
        user = User(
            wallet_address=data.wallet_address,
            display_name=data.display_name,
            preferred_chain=data.preferred_chain,
            email=data.email,
            notifications_enabled=data.notifications_enabled,
            theme=data.theme
        )
        db.add(user)
    else:
        user.display_name = data.display_name or user.display_name
        user.preferred_chain = data.preferred_chain or user.preferred_chain
        user.email = data.email or user.email
        user.notifications_enabled = data.notifications_enabled
        user.theme = data.theme
        
    await db.commit()
    await db.refresh(user)
    return {
        "id": str(user.id),
        "wallet_address": user.wallet_address,
        "display_name": user.display_name,
        "preferred_chain": user.preferred_chain,
        "email": user.email,
        "notifications_enabled": user.notifications_enabled,
        "theme": user.theme,
        "is_active": user.is_active
    }

@router.get("/users/{wallet_address}", response_model=UserResponse)
async def get_user(wallet_address: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.wallet_address == wallet_address))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "id": str(user.id),
        "wallet_address": user.wallet_address,
        "display_name": user.display_name,
        "preferred_chain": user.preferred_chain,
        "email": user.email,
        "notifications_enabled": user.notifications_enabled,
        "theme": user.theme,
        "is_active": user.is_active
    }
