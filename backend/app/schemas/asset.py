from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class AssetBase(BaseModel):
    chain: str = Field(..., description="Blockchain network (stellar, bitcoin, ethereum)")
    address: Optional[str] = Field(None, description="Contract address or asset code")
    symbol: str = Field(..., description="Asset symbol (e.g., USDC, BTC)")
    name: str = Field(..., description="Full asset name")
    decimals: Optional[int] = Field(None, description="Number of decimal places")
    description: Optional[str] = Field(None, description="Asset description")
    icon_url: Optional[str] = Field(None, description="URL to asset icon")
    website_url: Optional[str] = Field(None, description="Official website")
    tags: Optional[str] = Field(None, description="Comma-separated tags")


class AssetCreate(AssetBase):
    pass


class AssetUpdate(BaseModel):
    name: Optional[str] = None
    decimals: Optional[int] = None
    description: Optional[str] = None
    icon_url: Optional[str] = None
    website_url: Optional[str] = None
    is_verified: Optional[bool] = None
    is_active: Optional[bool] = None
    tags: Optional[str] = None


class AssetResponse(AssetBase):
    id: str
    is_verified: bool
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True