from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ChainConfigCreate(BaseModel):
    chain_id: str = Field(min_length=1, max_length=64)
    chain_name: str = Field(min_length=1, max_length=128)
    chain_type: str = Field(min_length=1, max_length=32)
    network: str = Field(pattern="^(mainnet|testnet)$")
    confirmations_required: int = Field(default=1, ge=1)
    native_currency_symbol: str = Field(min_length=1, max_length=16)
    explorer_url: Optional[str] = None
    rpc_url: Optional[str] = None
    is_enabled: bool = True
    max_fee_per_tx: Optional[str] = None


class ChainConfigUpdate(BaseModel):
    chain_name: Optional[str] = None
    confirmations_required: Optional[int] = Field(default=None, ge=1)
    explorer_url: Optional[str] = None
    rpc_url: Optional[str] = None
    is_enabled: Optional[bool] = None
    max_fee_per_tx: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(active|degraded|offline)$")


class ChainConfigResponse(BaseModel):
    id: str
    chain_id: str
    chain_name: str
    chain_type: str
    network: str
    confirmations_required: int
    native_currency_symbol: str
    explorer_url: Optional[str] = None
    rpc_url: Optional[str] = None
    is_enabled: bool
    max_fee_per_tx: Optional[str] = None
    status: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChainHealthResponse(BaseModel):
    chain_id: str
    status: str
    reachable: bool
    latency_ms: Optional[float] = None
    message: Optional[str] = None
