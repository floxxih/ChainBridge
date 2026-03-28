from pydantic import BaseModel, Field
from typing import Optional


class TimelockValidateRequest(BaseModel):
    time_lock: int = Field(gt=0)
    source_chain: Optional[str] = None
    dest_chain: Optional[str] = None


class TimelockWarningResponse(BaseModel):
    level: str
    message: str
    recommendation: Optional[str] = None


class TimelockValidationResponse(BaseModel):
    valid: bool
    warnings: list[TimelockWarningResponse]
    recommended_duration: Optional[int] = None
    adjusted_timelock: Optional[int] = None


class FeeEstimateRequest(BaseModel):
    source_chain: str
    dest_chain: str
    amount: float = Field(gt=0)
    amount_asset: str = "USD"


class FeeComponentResponse(BaseModel):
    name: str
    amount: float
    asset: str
    description: str


class ChainFeeResponse(BaseModel):
    chain: str
    total_fee: float
    asset: str
    components: list[FeeComponentResponse]
    estimated_at: str


class SwapFeeBreakdownResponse(BaseModel):
    source_chain_fee: ChainFeeResponse
    dest_chain_fee: ChainFeeResponse
    relayer_fee: FeeComponentResponse
    total_usd_estimate: Optional[float] = None


class FeeComparisonResponse(BaseModel):
    chain: str
    fee: float
    asset: str
    speed: str
    recommended: bool = False


class PriceRequest(BaseModel):
    assets: list[str] = Field(min_length=1)


class PriceResponse(BaseModel):
    asset: str
    price_usd: float
    source: str
    timestamp: str
    confidence: str


class ExchangeRateRequest(BaseModel):
    from_asset: str
    to_asset: str


class ExchangeRateResponse(BaseModel):
    from_asset: str
    to_asset: str
    rate: float
    inverse_rate: float
    from_price_usd: Optional[float] = None
    to_price_usd: Optional[float] = None
    timestamp: str


class RateCalculateRequest(BaseModel):
    from_asset: str
    to_asset: str
    from_amount: float = Field(gt=0)
    source_chain: Optional[str] = None
    dest_chain: Optional[str] = None


class RateQuoteResponse(BaseModel):
    from_asset: str
    to_asset: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee_total_usd: Optional[float] = None
    slippage_estimate: float
    effective_rate: float
    timestamp: str


class CEXComparisonRequest(BaseModel):
    from_asset: str
    to_asset: str
    from_amount: float = Field(gt=0)


class RateAlertRequest(BaseModel):
    from_asset: str
    to_asset: str
    target_rate: float = Field(gt=0)
