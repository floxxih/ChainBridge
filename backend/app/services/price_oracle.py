"""Price oracle integration for cross-chain swap exchange rates (#68)."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# Default price data (fallback when external sources are unavailable)
DEFAULT_PRICES: dict[str, float] = {
    "XLM": 0.15,
    "BTC": 65000.0,
    "ETH": 3500.0,
    "SOL": 150.0,
    "USDC": 1.0,
    "USDT": 1.0,
}

# Cache TTL in seconds
PRICE_CACHE_TTL = 60
# Maximum acceptable deviation between sources (10%)
MAX_PRICE_DEVIATION = 0.10


@dataclass
class PriceData:
    asset: str
    price_usd: float
    source: str
    timestamp: str
    confidence: str  # "high", "medium", "low"

    def to_dict(self) -> dict:
        return {
            "asset": self.asset,
            "price_usd": self.price_usd,
            "source": self.source,
            "timestamp": self.timestamp,
            "confidence": self.confidence,
        }


@dataclass
class PriceAlert:
    asset: str
    alert_type: str  # "deviation", "stale", "unavailable"
    message: str
    severity: str  # "info", "warning", "critical"
    timestamp: str

    def to_dict(self) -> dict:
        return {
            "asset": self.asset,
            "alert_type": self.alert_type,
            "message": self.message,
            "severity": self.severity,
            "timestamp": self.timestamp,
        }


@dataclass
class PriceHistoryEntry:
    asset: str
    price_usd: float
    source: str
    timestamp: str


class PriceOracleService:
    """Aggregates prices from multiple sources with caching and alerts."""

    def __init__(self) -> None:
        self._cache: dict[str, tuple[PriceData, float]] = {}
        self._history: list[PriceHistoryEntry] = []
        self._alerts: list[PriceAlert] = []

    async def get_price(self, asset: str) -> PriceData:
        asset_upper = asset.upper()
        now = time.time()

        # Check cache
        if asset_upper in self._cache:
            cached_data, cached_at = self._cache[asset_upper]
            if now - cached_at < PRICE_CACHE_TTL:
                return cached_data

        # Try external sources, fall back to defaults
        price_data = await self._fetch_from_sources(asset_upper)

        # Cache the result
        self._cache[asset_upper] = (price_data, now)
        self._record_history(price_data)

        return price_data

    async def get_prices(self, assets: list[str]) -> dict[str, PriceData]:
        result = {}
        for asset in assets:
            result[asset.upper()] = await self.get_price(asset)
        return result

    async def get_exchange_rate(self, from_asset: str, to_asset: str) -> dict:
        from_price = await self.get_price(from_asset)
        to_price = await self.get_price(to_asset)

        if to_price.price_usd == 0:
            return {
                "from_asset": from_asset.upper(),
                "to_asset": to_asset.upper(),
                "rate": 0.0,
                "inverse_rate": 0.0,
                "error": f"Price unavailable for {to_asset}.",
            }

        rate = from_price.price_usd / to_price.price_usd
        inverse_rate = to_price.price_usd / from_price.price_usd if rate > 0 else 0.0

        return {
            "from_asset": from_asset.upper(),
            "to_asset": to_asset.upper(),
            "rate": round(rate, 8),
            "inverse_rate": round(inverse_rate, 8),
            "from_price_usd": from_price.price_usd,
            "to_price_usd": to_price.price_usd,
            "sources": {
                from_asset.upper(): from_price.source,
                to_asset.upper(): to_price.source,
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    def check_price_deviation(
        self, asset: str, price_a: float, price_b: float
    ) -> Optional[PriceAlert]:
        if price_a == 0 or price_b == 0:
            return None

        deviation = abs(price_a - price_b) / max(price_a, price_b)

        if deviation > MAX_PRICE_DEVIATION:
            alert = PriceAlert(
                asset=asset.upper(),
                alert_type="deviation",
                message=(
                    f"Price deviation of {deviation:.1%} detected for {asset}. "
                    f"Source A: ${price_a:.4f}, Source B: ${price_b:.4f}."
                ),
                severity="critical" if deviation > 0.20 else "warning",
                timestamp=datetime.now(timezone.utc).isoformat(),
            )
            self._alerts.append(alert)
            return alert

        return None

    def get_price_history(
        self, asset: Optional[str] = None, limit: int = 100
    ) -> list[dict]:
        records = self._history
        if asset:
            records = [r for r in records if r.asset == asset.upper()]
        return [
            {
                "asset": r.asset,
                "price_usd": r.price_usd,
                "source": r.source,
                "timestamp": r.timestamp,
            }
            for r in records[-limit:]
        ]

    def get_alerts(self, asset: Optional[str] = None, limit: int = 50) -> list[dict]:
        records = self._alerts
        if asset:
            records = [r for r in records if r.asset == asset.upper()]
        return [a.to_dict() for a in records[-limit:]]

    async def _fetch_from_sources(self, asset: str) -> PriceData:
        now_iso = datetime.now(timezone.utc).isoformat()

        # Try CoinGecko API
        coingecko_price = await self._fetch_coingecko(asset)
        if coingecko_price is not None:
            # Cross-check with fallback prices for deviation detection
            fallback = DEFAULT_PRICES.get(asset)
            if fallback:
                self.check_price_deviation(asset, coingecko_price, fallback)
            return PriceData(
                asset=asset,
                price_usd=coingecko_price,
                source="coingecko",
                timestamp=now_iso,
                confidence="high",
            )

        # Fallback to default prices
        fallback_price = DEFAULT_PRICES.get(asset, 0.0)
        confidence = "medium" if fallback_price > 0 else "low"

        if fallback_price == 0:
            self._alerts.append(
                PriceAlert(
                    asset=asset,
                    alert_type="unavailable",
                    message=f"No price data available for {asset}.",
                    severity="critical",
                    timestamp=now_iso,
                )
            )

        return PriceData(
            asset=asset,
            price_usd=fallback_price,
            source="default",
            timestamp=now_iso,
            confidence=confidence,
        )

    async def _fetch_coingecko(self, asset: str) -> Optional[float]:
        asset_id_map = {
            "XLM": "stellar",
            "BTC": "bitcoin",
            "ETH": "ethereum",
            "SOL": "solana",
            "USDC": "usd-coin",
            "USDT": "tether",
        }
        coin_id = asset_id_map.get(asset)
        if not coin_id:
            return None

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    "https://api.coingecko.com/api/v3/simple/price",
                    params={"ids": coin_id, "vs_currencies": "usd"},
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return data.get(coin_id, {}).get("usd")
        except (httpx.HTTPError, KeyError, ValueError) as exc:
            logger.warning("CoinGecko fetch failed for %s: %s", asset, exc)
        return None

    def _record_history(self, price_data: PriceData) -> None:
        self._history.append(
            PriceHistoryEntry(
                asset=price_data.asset,
                price_usd=price_data.price_usd,
                source=price_data.source,
                timestamp=price_data.timestamp,
            )
        )
        if len(self._history) > 5000:
            self._history = self._history[-5000:]
