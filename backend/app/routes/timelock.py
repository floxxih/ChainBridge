"""Timelock validation endpoints (#56)."""

from typing import Annotated, Optional

from fastapi import APIRouter, Query

from app.schemas.fees import (
    TimelockValidateRequest,
    TimelockValidationResponse,
)
from app.services.timelock_validation import TimelockValidationService

router = APIRouter()
timelock_service = TimelockValidationService()


@router.post("/validate", response_model=TimelockValidationResponse)
async def validate_timelock(data: TimelockValidateRequest):
    result = timelock_service.validate_timelock(
        time_lock=data.time_lock,
        source_chain=data.source_chain,
        dest_chain=data.dest_chain,
    )
    return result.to_dict()


@router.get("/recommendations")
async def get_timelock_recommendations(
    chain: Annotated[Optional[str], Query()] = None,
):
    return timelock_service.get_chain_recommendations(chain)
