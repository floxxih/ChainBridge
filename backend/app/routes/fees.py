"""Fee estimation and price oracle endpoints (#58, #68, #70)."""

from typing import Annotated, Optional

from fastapi import APIRouter, Query

from app.schemas.fees import (
    CEXComparisonRequest,
    ExchangeRateRequest,
    FeeComparisonResponse,
    FeeEstimateRequest,
    PriceRequest,
    PriceResponse,
    RateAlertRequest,
    RateCalculateRequest,
    RateQuoteResponse,
    SwapFeeBreakdownResponse,
)
from app.services.fee_estimation import FeeEstimationService
from app.services.price_oracle import PriceOracleService
from app.services.rate_calculator import SwapRateCalculatorService

router = APIRouter()

fee_service = FeeEstimationService()
price_oracle = PriceOracleService()
rate_calculator = SwapRateCalculatorService(price_oracle, fee_service)


# --- Fee Estimation Endpoints ---


@router.get("/fees/{chain}")
async def get_chain_fees(chain: str):
    estimate = fee_service.estimate_chain_fee(chain)
    return estimate.to_dict()


@router.post("/fees/estimate", response_model=SwapFeeBreakdownResponse)
async def estimate_swap_fees(data: FeeEstimateRequest):
    breakdown = fee_service.estimate_swap_fees(
        source_chain=data.source_chain,
        dest_chain=data.dest_chain,
        amount=data.amount,
        amount_asset=data.amount_asset,
    )
    return breakdown.to_dict()


@router.get("/fees/compare/all", response_model=list[FeeComparisonResponse])
async def compare_fees(
    chains: Annotated[Optional[str], Query()] = None,
):
    chain_list = chains.split(",") if chains else None
    comparisons = fee_service.compare_fees(chain_list)
    return [
        {
            "chain": c.chain,
            "fee": c.fee,
            "asset": c.asset,
            "speed": c.speed,
            "recommended": c.recommended,
        }
        for c in comparisons
    ]


@router.get("/fees/history")
async def get_fee_history(
    chain: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=500)] = 100,
):
    return fee_service.get_fee_history(chain=chain, limit=limit)


@router.get("/fees/optimize")
async def get_fee_optimization(source_chain: str, dest_chain: str):
    return fee_service.get_optimization_suggestions(source_chain, dest_chain)


# --- Price Oracle Endpoints ---


@router.get("/prices/{asset}", response_model=PriceResponse)
async def get_asset_price(asset: str):
    price = await price_oracle.get_price(asset)
    return price.to_dict()


@router.post("/prices/bulk")
async def get_bulk_prices(data: PriceRequest):
    prices = await price_oracle.get_prices(data.assets)
    return {k: v.to_dict() for k, v in prices.items()}


@router.post("/prices/exchange-rate")
async def get_exchange_rate(data: ExchangeRateRequest):
    return await price_oracle.get_exchange_rate(data.from_asset, data.to_asset)


@router.get("/prices/history/all")
async def get_price_history(
    asset: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=500)] = 100,
):
    return price_oracle.get_price_history(asset=asset, limit=limit)


@router.get("/prices/alerts/all")
async def get_price_alerts(
    asset: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=100)] = 50,
):
    return price_oracle.get_alerts(asset=asset, limit=limit)


# --- Rate Calculator Endpoints ---


@router.post("/rates/calculate", response_model=RateQuoteResponse)
async def calculate_rate(data: RateCalculateRequest):
    quote = await rate_calculator.calculate_rate(
        from_asset=data.from_asset,
        to_asset=data.to_asset,
        from_amount=data.from_amount,
        source_chain=data.source_chain,
        dest_chain=data.dest_chain,
    )
    return quote.to_dict()


@router.post("/rates/compare-cex")
async def compare_with_cex(data: CEXComparisonRequest):
    return await rate_calculator.compare_with_cex(
        from_asset=data.from_asset,
        to_asset=data.to_asset,
        from_amount=data.from_amount,
    )


@router.get("/rates/history")
async def get_rate_history(
    from_asset: Annotated[Optional[str], Query()] = None,
    to_asset: Annotated[Optional[str], Query()] = None,
    limit: Annotated[int, Query(le=500)] = 100,
):
    return rate_calculator.get_rate_history(
        from_asset=from_asset, to_asset=to_asset, limit=limit
    )


@router.post("/rates/alerts")
async def create_rate_alert(data: RateAlertRequest):
    return rate_calculator.add_rate_alert(
        from_asset=data.from_asset,
        to_asset=data.to_asset,
        target_rate=data.target_rate,
    )


@router.get("/rates/alerts/all")
async def get_rate_alerts():
    return rate_calculator.get_rate_alerts()


@router.get("/rates/tips")
async def get_rate_tips(from_asset: str, to_asset: str, from_amount: float):
    return rate_calculator.get_optimization_tips(from_asset, to_asset, from_amount)
