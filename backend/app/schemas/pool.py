from pydantic import BaseModel, Field, model_validator
from typing import Optional
from datetime import datetime


class PoolSnapshotCreate(BaseModel):
    pool_id: int = Field(..., ge=0)
    asset_a: str
    asset_b: str
    reserve_a: int = Field(..., ge=0)
    reserve_b: int = Field(..., ge=0)


class PoolSnapshotResponse(BaseModel):
    id: str
    pool_id: int
    asset_a: str
    asset_b: str
    reserve_a: int
    reserve_b: int
    ratio: Optional[float]
    captured_at: datetime

    class Config:
        from_attributes = True


class PoolHealthResponse(BaseModel):
    pool_id: int
    asset_a: str
    asset_b: str
    reserve_a: int
    reserve_b: int
    ratio: Optional[float]
    ratio_drift_pct: Optional[float]
    status: str
    last_checked_at: datetime

    class Config:
        from_attributes = True


class PoolHealthSummary(BaseModel):
    total_pools: int
    healthy: int
    warning: int
    critical: int
    pools: list[PoolHealthResponse]
