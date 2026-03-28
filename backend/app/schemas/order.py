from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Optional
from datetime import datetime

from app.utils.address_validation import (
    SUPPORTED_CHAINS,
    detect_address_chain,
    validate_address,
)


class OrderCreate(BaseModel):
    creator: str
    from_chain: str
    to_chain: str
    from_asset: str
    to_asset: str
    from_amount: int = Field(gt=0)
    to_amount: int = Field(gt=0)
    min_fill_amount: Optional[int] = None
    expiry: int = Field(gt=0)

    @field_validator("from_chain", "to_chain")
    @classmethod
    def validate_chain(cls, v: str) -> str:
        v = v.lower()
        if v not in SUPPORTED_CHAINS:
            raise ValueError(
                f"Unsupported chain '{v}'. Must be one of: {', '.join(sorted(SUPPORTED_CHAINS))}"
            )
        return v

    @model_validator(mode="after")
    def validate_creator_address(self):
        result = validate_address(self.creator, self.from_chain)
        if not result.valid:
            raise ValueError(
                f"Invalid creator address for {self.from_chain}: {result.error}"
            )
        return self


class OrderMatch(BaseModel):
    counterparty: str
    fill_amount: Optional[int] = None

    @field_validator("counterparty")
    @classmethod
    def validate_counterparty(cls, v: str) -> str:
        result = detect_address_chain(v)
        if not result.valid:
            raise ValueError(f"Invalid counterparty address: {result.error}")
        return v


class OrderResponse(BaseModel):
    id: str
    onchain_id: Optional[int] = None
    creator: str
    from_chain: str
    to_chain: str
    from_asset: str
    to_asset: str
    from_amount: int
    to_amount: int
    min_fill_amount: Optional[int] = None
    filled_amount: int = 0
    expiry: int
    status: str
    counterparty: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
