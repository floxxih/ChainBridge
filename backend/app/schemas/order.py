from decimal import Decimal
from pydantic import BaseModel, Field, field_validator, model_validator
from typing import Any, Optional
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
    trigger_price: Optional[Decimal] = Field(default=None, gt=0)
    valid_from: Optional[int] = Field(default=None, gt=0)

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

    @model_validator(mode="after")
    def validate_time_window(self):
        if self.valid_from is not None and self.valid_from >= self.expiry:
            raise ValueError("valid_from must be earlier than expiry")
        return self


class OrderAmend(BaseModel):
    from_amount: Optional[int] = Field(default=None, gt=0)
    to_amount: Optional[int] = Field(default=None, gt=0)
    min_fill_amount: Optional[int] = Field(default=None, gt=0)
    expiry: Optional[int] = Field(default=None, gt=0)
    trigger_price: Optional[Decimal] = Field(default=None, gt=0)
    valid_from: Optional[int] = Field(default=None, gt=0)
    note: Optional[str] = None

    @model_validator(mode="after")
    def at_least_one_field(self):
        if all(
            v is None
            for v in (
                self.from_amount,
                self.to_amount,
                self.min_fill_amount,
                self.expiry,
                self.trigger_price,
                self.valid_from,
            )
        ):
            raise ValueError("At least one amendable field must be provided")
        return self


class OrderAmendmentEntry(BaseModel):
    sequence: int
    amended_at: str
    changes: dict[str, Any]
    note: Optional[str] = None


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
    amendment_count: int = 0
    amendment_log: list[dict[str, Any]] = []
    trigger_price: Optional[Decimal] = None
    valid_from: Optional[int] = None

    class Config:
        from_attributes = True
