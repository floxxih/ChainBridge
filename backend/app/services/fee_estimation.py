"""Fee estimation and display system for cross-chain swaps (#58)."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional


@dataclass
class FeeComponent:
    name: str
    amount: float
    asset: str
    description: str


@dataclass
class FeeEstimate:
    chain: str
    total_fee: float
    asset: str
    components: list[FeeComponent]
    estimated_at: str

    def to_dict(self) -> dict:
        return {
            "chain": self.chain,
            "total_fee": self.total_fee,
            "asset": self.asset,
            "components": [
                {
                    "name": c.name,
                    "amount": c.amount,
                    "asset": c.asset,
                    "description": c.description,
                }
                for c in self.components
            ],
            "estimated_at": self.estimated_at,
        }


@dataclass
class SwapFeeBreakdown:
    source_chain_fee: FeeEstimate
    dest_chain_fee: FeeEstimate
    relayer_fee: FeeComponent
    total_usd_estimate: Optional[float] = None

    def to_dict(self) -> dict:
        return {
            "source_chain_fee": self.source_chain_fee.to_dict(),
            "dest_chain_fee": self.dest_chain_fee.to_dict(),
            "relayer_fee": {
                "name": self.relayer_fee.name,
                "amount": self.relayer_fee.amount,
                "asset": self.relayer_fee.asset,
                "description": self.relayer_fee.description,
            },
            "total_usd_estimate": self.total_usd_estimate,
        }


@dataclass
class FeeComparison:
    chain: str
    fee: float
    asset: str
    speed: str
    recommended: bool = False


@dataclass
class FeeRecord:
    chain: str
    fee: float
    asset: str
    timestamp: str


# Base fee constants per chain (in native asset units)
CHAIN_FEE_CONFIG: dict[str, dict] = {
    "stellar": {
        "base_fee": 0.00001,
        "asset": "XLM",
        "contract_fee": 0.001,
        "speed": "~5 seconds",
    },
    "bitcoin": {
        "base_fee": 0.0001,
        "asset": "BTC",
        "contract_fee": 0.0002,
        "speed": "~10-60 minutes",
    },
    "ethereum": {
        "base_fee": 0.002,
        "asset": "ETH",
        "contract_fee": 0.005,
        "speed": "~12-60 seconds",
    },
    "solana": {
        "base_fee": 0.000005,
        "asset": "SOL",
        "contract_fee": 0.0001,
        "speed": "~400ms",
    },
}

# Relayer fee as a percentage of swap amount
RELAYER_FEE_PERCENT = 0.001  # 0.1%
MIN_RELAYER_FEE_USD = 0.50
MAX_RELAYER_FEE_USD = 50.0


class FeeEstimationService:
    """Estimates and tracks fees for cross-chain swaps."""

    def __init__(self) -> None:
        self._fee_history: list[FeeRecord] = []

    def estimate_chain_fee(self, chain: str) -> FeeEstimate:
        chain_lower = chain.lower()
        config = CHAIN_FEE_CONFIG.get(chain_lower)
        if not config:
            return FeeEstimate(
                chain=chain_lower,
                total_fee=0.0,
                asset="UNKNOWN",
                components=[],
                estimated_at=datetime.now(timezone.utc).isoformat(),
            )

        network_fee = FeeComponent(
            name="network_fee",
            amount=config["base_fee"],
            asset=config["asset"],
            description=f"Base network transaction fee on {chain}.",
        )
        contract_fee = FeeComponent(
            name="contract_fee",
            amount=config["contract_fee"],
            asset=config["asset"],
            description=f"HTLC smart contract execution fee on {chain}.",
        )
        total = config["base_fee"] + config["contract_fee"]
        now = datetime.now(timezone.utc).isoformat()

        self._record_fee(chain_lower, total, config["asset"])

        return FeeEstimate(
            chain=chain_lower,
            total_fee=round(total, 8),
            asset=config["asset"],
            components=[network_fee, contract_fee],
            estimated_at=now,
        )

    def estimate_swap_fees(
        self,
        source_chain: str,
        dest_chain: str,
        amount: float,
        amount_asset: str = "USD",
    ) -> SwapFeeBreakdown:
        source_fee = self.estimate_chain_fee(source_chain)
        dest_fee = self.estimate_chain_fee(dest_chain)

        relayer_amount = max(amount * RELAYER_FEE_PERCENT, MIN_RELAYER_FEE_USD)
        relayer_amount = min(relayer_amount, MAX_RELAYER_FEE_USD)
        relayer_fee = FeeComponent(
            name="relayer_fee",
            amount=round(relayer_amount, 6),
            asset=amount_asset,
            description=(
                f"Relayer service fee ({RELAYER_FEE_PERCENT * 100}% of swap amount, "
                f"min ${MIN_RELAYER_FEE_USD}, max ${MAX_RELAYER_FEE_USD})."
            ),
        )

        return SwapFeeBreakdown(
            source_chain_fee=source_fee,
            dest_chain_fee=dest_fee,
            relayer_fee=relayer_fee,
            total_usd_estimate=None,
        )

    def compare_fees(self, chains: Optional[list[str]] = None) -> list[FeeComparison]:
        target_chains = chains or list(CHAIN_FEE_CONFIG.keys())
        comparisons = []
        min_fee = float("inf")
        results = []

        for chain in target_chains:
            chain_lower = chain.lower()
            config = CHAIN_FEE_CONFIG.get(chain_lower)
            if not config:
                continue
            total = config["base_fee"] + config["contract_fee"]
            results.append((chain_lower, total, config["asset"], config["speed"]))
            if total < min_fee:
                min_fee = total

        for chain_name, fee, asset, speed in results:
            comparisons.append(
                FeeComparison(
                    chain=chain_name,
                    fee=round(fee, 8),
                    asset=asset,
                    speed=speed,
                    recommended=(fee == min_fee),
                )
            )

        return comparisons

    def get_fee_history(
        self, chain: Optional[str] = None, limit: int = 100
    ) -> list[dict]:
        records = self._fee_history
        if chain:
            records = [r for r in records if r.chain == chain.lower()]
        return [
            {
                "chain": r.chain,
                "fee": r.fee,
                "asset": r.asset,
                "timestamp": r.timestamp,
            }
            for r in records[-limit:]
        ]

    def get_optimization_suggestions(
        self, source_chain: str, dest_chain: str
    ) -> list[dict]:
        suggestions = []
        src = CHAIN_FEE_CONFIG.get(source_chain.lower())
        dst = CHAIN_FEE_CONFIG.get(dest_chain.lower())

        if src and dst:
            src_total = src["base_fee"] + src["contract_fee"]
            dst_total = dst["base_fee"] + dst["contract_fee"]

            cheapest = min(CHAIN_FEE_CONFIG.items(), key=lambda x: x[1]["base_fee"])
            if cheapest[0] not in (source_chain.lower(), dest_chain.lower()):
                suggestions.append(
                    {
                        "type": "alternative_route",
                        "message": (
                            f"Consider routing through {cheapest[0]} for lower fees "
                            f"(base fee: {cheapest[1]['base_fee']} {cheapest[1]['asset']})."
                        ),
                    }
                )

            if src_total > 0.003:
                suggestions.append(
                    {
                        "type": "timing",
                        "message": (
                            f"{source_chain} fees may be lower during off-peak hours."
                        ),
                    }
                )

            if dst_total > 0.003:
                suggestions.append(
                    {
                        "type": "timing",
                        "message": (
                            f"{dest_chain} fees may be lower during off-peak hours."
                        ),
                    }
                )

        return suggestions

    def _record_fee(self, chain: str, fee: float, asset: str) -> None:
        self._fee_history.append(
            FeeRecord(
                chain=chain,
                fee=fee,
                asset=asset,
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
        )
        # Keep only last 1000 records
        if len(self._fee_history) > 1000:
            self._fee_history = self._fee_history[-1000:]
