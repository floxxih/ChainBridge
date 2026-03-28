from pydantic import BaseModel, Field, field_validator
from typing import Optional
from datetime import datetime

from app.utils.address_validation import detect_address_chain


class HTLCCreate(BaseModel):
    sender: str
    receiver: str
    amount: int = Field(gt=0)
    hash_lock: str
    time_lock: int = Field(gt=0)
    hash_algorithm: str = "sha256"

    @field_validator("sender", "receiver")
    @classmethod
    def validate_address(cls, v: str, info) -> str:
        result = detect_address_chain(v)
        if not result.valid:
            raise ValueError(f"Invalid {info.field_name} address: {result.error}")
        return v


class HTLCClaim(BaseModel):
    secret: str


class HTLCResponse(BaseModel):
    id: str
    onchain_id: Optional[str] = None
    sender: str
    receiver: str
    amount: int
    hash_lock: str
    time_lock: int
    status: str
    secret: Optional[str] = None
    hash_algorithm: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class HTLCTimelineEvent(BaseModel):
    label: str
    timestamp: Optional[str] = None
    completed: bool


class HTLCStatusResponse(HTLCResponse):
    seconds_remaining: int
    can_claim: bool
    can_refund: bool
    phase: str
    timeline: list[HTLCTimelineEvent]
