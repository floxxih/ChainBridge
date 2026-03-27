from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field

DisputeCategory = Literal[
    "timeout",
    "incorrect_amount",
    "counterparty_unresponsive",
    "proof_failure",
    "chain_reorg",
    "other",
]

DisputeStatus = Literal["submitted", "in_review", "resolved", "rejected", "refunded"]
DisputePriority = Literal["low", "normal", "high", "critical"]
ResolutionAction = Literal["approve", "reject", "refund_override", "manual_settlement"]


class DisputeEvidenceItem(BaseModel):
    type: str = Field(description="e.g. tx_hash, screenshot, message, explorer_link")
    value: str = Field(description="Raw evidence value (URL, hash, text, etc.)")
    description: Optional[str] = None


class DisputeCreate(BaseModel):
    swap_id: str
    submitted_by: str
    category: DisputeCategory
    reason: str = Field(min_length=10, max_length=4000)
    priority: DisputePriority = "normal"
    evidence: list[DisputeEvidenceItem] = Field(default_factory=list)


class DisputeEvidenceCreate(BaseModel):
    evidence: list[DisputeEvidenceItem] = Field(min_length=1)


class DisputeReview(BaseModel):
    status: Literal["in_review"] = "in_review"
    admin_notes: str = Field(min_length=3, max_length=4000)
    reviewed_by: str


class DisputeResolve(BaseModel):
    status: Literal["resolved", "rejected", "refunded"]
    resolution_action: ResolutionAction
    resolution: str = Field(min_length=5, max_length=4000)
    admin_notes: Optional[str] = Field(default=None, max_length=4000)
    resolved_by: str
    refund_override: bool = False
    refund_amount: Optional[int] = Field(default=None, ge=0)


class DisputeResponse(BaseModel):
    id: str
    swap_id: str
    submitted_by: str
    category: str
    reason: str
    status: str
    priority: str
    evidence: list[dict]
    admin_notes: Optional[str] = None
    resolution: Optional[str] = None
    resolution_action: Optional[str] = None
    refund_override: bool = False
    refund_amount: Optional[int] = None
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolved_at: Optional[datetime] = None
    action_log: list[dict] = Field(default_factory=list)
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
