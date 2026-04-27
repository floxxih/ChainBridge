from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SwapProof(BaseModel):
    chain: str
    tx_hash: str
    block_height: int
    proof_data: str


class SwapResponse(BaseModel):
    id: str
    onchain_id: Optional[str] = None
    stellar_htlc_id: Optional[str] = None
    other_chain: str
    other_chain_tx: Optional[str] = None
    stellar_party: str
    other_party: str
    state: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ─── Batch proof schemas ──────────────────────────────────────────────────────

class SwapProofItem(BaseModel):
    swap_id: str
    proof: SwapProof


class BatchProofRequest(BaseModel):
    items: list[SwapProofItem] = Field(min_length=1, max_length=50)


class BatchProofItemResult(BaseModel):
    swap_id: str
    success: bool
    state: Optional[str] = None
    error: Optional[str] = None


class BatchProofResponse(BaseModel):
    total: int
    succeeded: int
    failed: int
    items: list[BatchProofItemResult]
