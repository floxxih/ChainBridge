"""Swap rate calculator and comparison tool (#70)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from app.services.fee_estimation import FeeEstimationService
from app.services.price_oracle import PriceOracleService


@dataclass
class RateQuote:
    from_asset: str
    to_asset: str
    from_amount: float
    to_amount: float
    exchange_rate: float
    fee_total_usd: Optional[float]
    slippage_estimate: float
    effective_rate: float
    timestamp: str

    def to_dict(self) -> dict:
        return {
            "from_asset": self.from_asset,
            "to_asset": self.to_asset,
            "from_amount": self.from_amount,
            "to_amount": self.to_amount,
            "exchange_rate": self.exchange_rate,
            "fee_total_usd": self.fee_total_usd,
            "slippage_estimate": self.slippage_estimate,
            "effective_rate": self.effective_rate,
            "timestamp": self.timestamp,
        }


@dataclass
class CEXComparison:
    exchange: str
    rate: float
    fee_percent: float
    total_receive: float
    savings_vs_cex: float


@dataclass
class RateAlert:
    from_asset: str
    to_asset: str
    target_rate: float
    current_rate: float
    triggered: bool
    message: str


# Simulated CEX rates for comparison (markup over mid-market)
CEX_FEE_RATES: dict[str, float] = {
    "binance": 0.001,
    "coinbase": 0.006,
    "kraken": 0.0026,
}

# Slippage estimates based on amount tiers (in USD)
SLIPPAGE_TIERS: list[tuple[float, float]] = [
    (1000, 0.001),  # < $1k: 0.1%
    (10000, 0.003),  # < $10k: 0.3%
    (100000, 0.005),  # < $100k: 0.5%
    (float("inf"), 0.01),  # >= $100k: 1.0%
]


class SwapRateCalculatorService:
    """Calculates swap rates and compares with centralized options."""

    def __init__(
        self,
        price_oracle: PriceOracleService,
        fee_service: FeeEstimationService,
    ) -> None:
        self._price_oracle = price_oracle
        self._fee_service = fee_service
        self._rate_history: list[dict] = []
        self._rate_alerts: list[RateAlert] = []

    async def calculate_rate(
        self,
        from_asset: str,
        to_asset: str,
        from_amount: float,
        source_chain: Optional[str] = None,
        dest_chain: Optional[str] = None,
    ) -> RateQuote:
        exchange = await self._price_oracle.get_exchange_rate(from_asset, to_asset)
        rate = exchange.get("rate", 0.0)

        from_price_usd = exchange.get("from_price_usd", 0.0)
        amount_usd = from_amount * from_price_usd

        slippage = self._estimate_slippage(amount_usd)
        effective_rate = rate * (1 - slippage) if rate > 0 else 0.0
        to_amount = from_amount * effective_rate

        fee_usd = None
        if source_chain and dest_chain:
            breakdown = self._fee_service.estimate_swap_fees(
                source_chain, dest_chain, amount_usd
            )
            fee_usd = breakdown.relayer_fee.amount

        now_iso = datetime.now(timezone.utc).isoformat()

        quote = RateQuote(
            from_asset=from_asset.upper(),
            to_asset=to_asset.upper(),
            from_amount=from_amount,
            to_amount=round(to_amount, 8),
            exchange_rate=round(rate, 8),
            fee_total_usd=round(fee_usd, 4) if fee_usd else None,
            slippage_estimate=slippage,
            effective_rate=round(effective_rate, 8),
            timestamp=now_iso,
        )

        self._record_rate(quote)
        self._check_alerts(from_asset, to_asset, rate)

        return quote

    async def compare_with_cex(
        self,
        from_asset: str,
        to_asset: str,
        from_amount: float,
    ) -> list[dict]:
        exchange = await self._price_oracle.get_exchange_rate(from_asset, to_asset)
        mid_rate = exchange.get("rate", 0.0)

        if mid_rate == 0:
            return []

        from_price_usd = exchange.get("from_price_usd", 0.0)
        amount_usd = from_amount * from_price_usd
        our_slippage = self._estimate_slippage(amount_usd)
        our_effective = mid_rate * (1 - our_slippage)
        our_receive = from_amount * our_effective

        comparisons = [
            {
                "exchange": "ChainBridge (DEX)",
                "rate": round(our_effective, 8),
                "fee_percent": round(our_slippage * 100, 4),
                "total_receive": round(our_receive, 8),
                "savings_vs_cex": 0.0,
            }
        ]

        for exchange_name, fee_rate in CEX_FEE_RATES.items():
            cex_rate = mid_rate * (1 - fee_rate)
            cex_receive = from_amount * cex_rate
            savings = our_receive - cex_receive

            comparisons.append(
                {
                    "exchange": exchange_name,
                    "rate": round(cex_rate, 8),
                    "fee_percent": round(fee_rate * 100, 4),
                    "total_receive": round(cex_receive, 8),
                    "savings_vs_cex": round(savings, 8),
                }
            )

        return comparisons

    def get_rate_history(
        self,
        from_asset: Optional[str] = None,
        to_asset: Optional[str] = None,
        limit: int = 100,
    ) -> list[dict]:
        records = self._rate_history
        if from_asset:
            records = [r for r in records if r["from_asset"] == from_asset.upper()]
        if to_asset:
            records = [r for r in records if r["to_asset"] == to_asset.upper()]
        return records[-limit:]

    def add_rate_alert(
        self,
        from_asset: str,
        to_asset: str,
        target_rate: float,
    ) -> dict:
        alert = RateAlert(
            from_asset=from_asset.upper(),
            to_asset=to_asset.upper(),
            target_rate=target_rate,
            current_rate=0.0,
            triggered=False,
            message=f"Alert: waiting for {from_asset}/{to_asset} to reach {target_rate}.",
        )
        self._rate_alerts.append(alert)
        return {
            "from_asset": alert.from_asset,
            "to_asset": alert.to_asset,
            "target_rate": alert.target_rate,
            "status": "active",
        }

    def get_rate_alerts(self) -> list[dict]:
        return [
            {
                "from_asset": a.from_asset,
                "to_asset": a.to_asset,
                "target_rate": a.target_rate,
                "current_rate": a.current_rate,
                "triggered": a.triggered,
                "message": a.message,
            }
            for a in self._rate_alerts
        ]

    def get_optimization_tips(
        self, from_asset: str, to_asset: str, from_amount: float
    ) -> list[str]:
        tips = []
        from_price = 0.0
        for asset, price in [("XLM", 0.15), ("BTC", 65000.0), ("ETH", 3500.0)]:
            if asset == from_asset.upper():
                from_price = price

        amount_usd = from_amount * from_price if from_price else 0.0

        if amount_usd > 10000:
            tips.append("Consider splitting into smaller swaps to reduce slippage.")
        if amount_usd < 100:
            tips.append(
                "Small swaps may incur proportionally higher fees. "
                "Consider batching transactions."
            )
        tips.append(
            "Check fee comparison across chains for the most cost-effective route."
        )
        tips.append("Monitor rate alerts to execute swaps at your target price.")
        return tips

    def _estimate_slippage(self, amount_usd: float) -> float:
        for threshold, slippage in SLIPPAGE_TIERS:
            if amount_usd < threshold:
                return slippage
        return SLIPPAGE_TIERS[-1][1]

    def _record_rate(self, quote: RateQuote) -> None:
        self._rate_history.append(
            {
                "from_asset": quote.from_asset,
                "to_asset": quote.to_asset,
                "rate": quote.exchange_rate,
                "effective_rate": quote.effective_rate,
                "timestamp": quote.timestamp,
            }
        )
        if len(self._rate_history) > 5000:
            self._rate_history = self._rate_history[-5000:]

    def _check_alerts(
        self, from_asset: str, to_asset: str, current_rate: float
    ) -> None:
        for alert in self._rate_alerts:
            if (
                alert.from_asset == from_asset.upper()
                and alert.to_asset == to_asset.upper()
                and not alert.triggered
            ):
                alert.current_rate = current_rate
                if current_rate >= alert.target_rate:
                    alert.triggered = True
                    alert.message = (
                        f"Rate alert triggered: {from_asset}/{to_asset} "
                        f"reached {current_rate} (target: {alert.target_rate})."
                    )
