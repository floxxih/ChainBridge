"""Swap status, history, and proof verification endpoints (#26, #59, #71)."""

import os
from datetime import datetime, timezone

from typing import Annotated, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config.database import get_db
from app.config.redis import get_redis, CacheService
from app.observability.metrics import observe_swap_completion
from app.models.swap import CrossChainSwap
from app.schemas.swap import (
    BatchProofItemResult,
    BatchProofRequest,
    BatchProofResponse,
    SwapResponse,
    SwapProof,
)
from app.middleware.auth import require_api_key
from app.utils.solana import SolanaVerificationError, verify_solana_proof
from app.ws.events import emit_swap_event, EventType

router = APIRouter()


@router.get("/", response_model=list[SwapResponse])
async def list_swaps(
    chain: Annotated[Optional[str], Query()] = None,
    state: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=100)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(CrossChainSwap)
    if chain:
        query = query.where(CrossChainSwap.other_chain == chain)
    if state:
        query = query.where(CrossChainSwap.state == state)
    query = query.order_by(CrossChainSwap.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    swaps = result.scalars().all()
    return [SwapResponse.model_validate(s) for s in swaps]


@router.get("/{swap_id}", response_model=SwapResponse)
async def get_swap(swap_id: str, db: AsyncSession = Depends(get_db)):
    cache = CacheService(get_redis())
    cached = await cache.get(f"swap:{swap_id}")
    if cached:
        return cached

    result = await db.execute(
        select(CrossChainSwap).where(CrossChainSwap.id == swap_id)
    )
    swap = result.scalar_one_or_none()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")

    response = SwapResponse.model_validate(swap).model_dump()
    await cache.set(f"swap:{swap_id}", response, ttl=30)
    return response


@router.post("/{swap_id}/verify-proof")
async def verify_proof(
    swap_id: str,
    proof: SwapProof,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    result = await db.execute(
        select(CrossChainSwap).where(CrossChainSwap.id == swap_id)
    )
    swap = result.scalar_one_or_none()
    if not swap:
        raise HTTPException(status_code=404, detail="Swap not found")

    if proof.chain.lower() == "solana":
        try:
            verification = verify_solana_proof(
                proof.proof_data,
                expected_program_id=os.getenv("SOLANA_PROGRAM_ID") or None,
            )
        except SolanaVerificationError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
    else:
        verification = {"chain": proof.chain.lower()}

    swap.other_chain_tx = proof.tx_hash
    swap.state = "executed"
    if swap.created_at:
        created_at = swap.created_at
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=timezone.utc)
        completion_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
        observe_swap_completion(proof.chain.lower(), swap.state, completion_seconds)
    await db.commit()

    redis = get_redis()
    cache = CacheService(redis)
    await cache.delete(f"swap:{swap_id}")

    response = SwapResponse.model_validate(swap)
    await emit_swap_event(redis, EventType.SWAP_PROOF_VERIFIED, response.model_dump())

    return {
        "status": "verified",
        "swap_id": str(swap.id),
        "state": swap.state,
        "verification": verification,
    }


@router.post("/batch-verify", response_model=BatchProofResponse, status_code=207)
async def batch_verify_proofs(
    data: BatchProofRequest,
    db: AsyncSession = Depends(get_db),
    _=Depends(require_api_key),
):
    """Submit proof for multiple swaps. Each is verified independently."""
    results: list[BatchProofItemResult] = []
    redis = get_redis()
    cache = CacheService(redis)

    for item in data.items:
        swap_id = item.swap_id
        proof = item.proof
        try:
            result = await db.execute(
                select(CrossChainSwap).where(CrossChainSwap.id == swap_id)
            )
            swap = result.scalar_one_or_none()
            if not swap:
                results.append(BatchProofItemResult(swap_id=swap_id, success=False, error="Swap not found"))
                continue

            if proof.chain.lower() == "solana":
                try:
                    verify_solana_proof(
                        proof.proof_data,
                        expected_program_id=os.getenv("SOLANA_PROGRAM_ID") or None,
                    )
                except SolanaVerificationError as exc:
                    results.append(BatchProofItemResult(swap_id=swap_id, success=False, error=str(exc)))
                    continue

            swap.other_chain_tx = proof.tx_hash
            swap.state = "executed"
            if swap.created_at:
                created_at = swap.created_at
                if created_at.tzinfo is None:
                    created_at = created_at.replace(tzinfo=timezone.utc)
                completion_seconds = (datetime.now(timezone.utc) - created_at).total_seconds()
                observe_swap_completion(proof.chain.lower(), swap.state, completion_seconds)

            await db.commit()
            await cache.delete(f"swap:{swap_id}")

            response = SwapResponse.model_validate(swap)
            await emit_swap_event(redis, EventType.SWAP_PROOF_VERIFIED, response.model_dump())
            results.append(BatchProofItemResult(swap_id=swap_id, success=True, state=swap.state))
        except Exception as exc:
            await db.rollback()
            results.append(BatchProofItemResult(swap_id=swap_id, success=False, error=str(exc)))

    succeeded = sum(1 for r in results if r.success)
    return BatchProofResponse(
        total=len(data.items),
        succeeded=succeeded,
        failed=len(results) - succeeded,
        items=results,
    )
