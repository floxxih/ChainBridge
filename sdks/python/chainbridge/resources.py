"""Resource clients — thin wrappers around REST endpoints."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from .http import AsyncHttpClient, HttpClient
from .types import (
    Asset,
    FeeBreakdown,
    FeeEstimate,
    Htlc,
    Order,
    OrderListPage,
    SuccessRateStats,
    Swap,
    VolumeStats,
)


def _filter_none(d: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in d.items() if v is not None}


class OrdersResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create(
        self,
        *,
        from_chain: str,
        to_chain: str,
        from_asset: str,
        to_asset: str,
        from_amount: str,
        to_amount: str,
        sender_address: str,
        expiry: int,
    ) -> Order:
        data = self._http.request(
            "POST",
            "/api/v1/orders",
            json={
                "from_chain": from_chain,
                "to_chain": to_chain,
                "from_asset": from_asset,
                "to_asset": to_asset,
                "from_amount": from_amount,
                "to_amount": to_amount,
                "sender_address": sender_address,
                "expiry": expiry,
            },
        )
        return Order.from_dict(data or {})

    def get(self, order_id: str) -> Order:
        data = self._http.request("GET", f"/api/v1/orders/{order_id}")
        return Order.from_dict(data or {})

    def list(
        self,
        *,
        from_chain: Optional[str] = None,
        to_chain: Optional[str] = None,
        status: Optional[str] = None,
        page: int = 1,
        limit: int = 20,
    ) -> OrderListPage:
        data = self._http.request(
            "GET",
            "/api/v1/orders",
            params=_filter_none(
                {
                    "from_chain": from_chain,
                    "to_chain": to_chain,
                    "status": status,
                    "page": page,
                    "limit": limit,
                }
            ),
        ) or {}
        pagination = data.get("pagination", {})
        return OrderListPage(
            orders=[Order.from_dict(o) for o in data.get("orders", [])],
            page=pagination.get("page", page),
            limit=pagination.get("limit", limit),
            total=pagination.get("total", 0),
            pages=pagination.get("pages", 0),
        )

    def cancel(self, order_id: str) -> Order:
        data = self._http.request("DELETE", f"/api/v1/orders/{order_id}")
        return Order.from_dict(data or {})


class HtlcsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create(
        self,
        *,
        sender_address: str,
        receiver_address: str,
        amount: str,
        hash_lock: str,
        time_lock: int,
    ) -> Htlc:
        data = self._http.request(
            "POST",
            "/api/v1/htlcs",
            json={
                "sender_address": sender_address,
                "receiver_address": receiver_address,
                "amount": amount,
                "hash_lock": hash_lock,
                "time_lock": time_lock,
            },
        )
        return Htlc.from_dict(data or {})

    def get(self, htlc_id: str) -> Htlc:
        return Htlc.from_dict(self._http.request("GET", f"/api/v1/htlcs/{htlc_id}") or {})

    def claim(self, htlc_id: str, *, secret: str, claimer_address: str) -> Htlc:
        data = self._http.request(
            "POST",
            f"/api/v1/htlcs/{htlc_id}/claim",
            json={"secret": secret, "claimer_address": claimer_address},
        )
        return Htlc.from_dict(data or {})

    def refund(self, htlc_id: str, *, refunder_address: str) -> Htlc:
        data = self._http.request(
            "POST",
            f"/api/v1/htlcs/{htlc_id}/refund",
            json={"refunder_address": refunder_address},
        )
        return Htlc.from_dict(data or {})


class SwapsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def execute(
        self,
        *,
        order_id: str,
        counterparty_address: str,
        destination_htlc_tx: str,
        proof: Dict[str, Any],
    ) -> Swap:
        data = self._http.request(
            "POST",
            "/api/v1/swaps",
            json={
                "order_id": order_id,
                "counterparty_address": counterparty_address,
                "destination_htlc_tx": destination_htlc_tx,
                "proof": proof,
            },
        )
        return Swap.from_dict(data or {})

    def get(self, swap_id: str) -> Swap:
        return Swap.from_dict(self._http.request("GET", f"/api/v1/swaps/{swap_id}") or {})

    def list(self, **filters: Any) -> List[Swap]:
        data = self._http.request("GET", "/api/v1/swaps", params=_filter_none(filters)) or {}
        items = data.get("swaps", data) if isinstance(data, dict) else data
        return [Swap.from_dict(s) for s in (items or [])]


class ProofsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def verify(self, **payload: Any) -> Dict[str, Any]:
        return self._http.request("POST", "/api/v1/proofs/verify", json=payload)


class MarketResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def get_fee(self, chain: str) -> FeeEstimate:
        data = self._http.request("GET", f"/api/v1/market/fees/{chain}") or {}
        return FeeEstimate(
            chain=data.get("chain", chain),
            base_fee=int(data.get("base_fee", 0)),
            fee_unit=data.get("fee_unit", ""),
            estimated_seconds=int(data.get("estimated_seconds", 0)),
        )

    def estimate_fees(
        self, *, from_chain: str, to_chain: str, from_amount: str
    ) -> FeeBreakdown:
        data = self._http.request(
            "POST",
            "/api/v1/market/fees/estimate",
            json={"from_chain": from_chain, "to_chain": to_chain, "from_amount": from_amount},
        ) or {}
        return FeeBreakdown(
            network_fees=data.get("network_fees", {}),
            protocol_fee_bps=int(data.get("protocol_fee_bps", 0)),
            total_fee_usd=str(data.get("total_fee_usd", "0")),
        )

    def get_rate(self, *, from_asset: str, to_asset: str) -> Dict[str, Any]:
        return self._http.request(
            "GET",
            "/api/v1/market/rate",
            params={"from_asset": from_asset, "to_asset": to_asset},
        )


class AssetsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def list(self, **filters: Any) -> List[Asset]:
        data = self._http.request("GET", "/api/v1/assets", params=_filter_none(filters))
        return [Asset.from_dict(a) for a in (data or [])]


class AnalyticsResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def volume(self, **filters: Any) -> VolumeStats:
        data = self._http.request("GET", "/api/v1/analytics/volume", params=_filter_none(filters)) or {}
        return VolumeStats(
            total_volume=str(data.get("total_volume", "0")),
            volume_by_chain=data.get("volume_by_chain", {}),
            volume_by_asset=data.get("volume_by_asset", {}),
            swap_count=int(data.get("swap_count", 0)),
            period=data.get("period", ""),
        )

    def success_rate(self, *, period: Optional[str] = None) -> SuccessRateStats:
        data = self._http.request(
            "GET",
            "/api/v1/analytics/success-rate",
            params=_filter_none({"period": period}),
        ) or {}
        return SuccessRateStats(
            success_rate=float(data.get("success_rate", 0.0)),
            total_swaps=int(data.get("total_swaps", 0)),
            successful_swaps=int(data.get("successful_swaps", 0)),
            failed_swaps=int(data.get("failed_swaps", 0)),
            expired_swaps=int(data.get("expired_swaps", 0)),
            period=data.get("period", ""),
        )


class AuthResource:
    def __init__(self, http: HttpClient) -> None:
        self._http = http

    def create_api_key(self, *, name: str, owner: str) -> Dict[str, Any]:
        return self._http.request(
            "POST", "/api/v1/auth/api-keys", json={"name": name, "owner": owner}
        )

    def exchange_for_token(self) -> Dict[str, Any]:
        return self._http.request("POST", "/api/v1/auth/token")

    def revoke_api_key(self, key_id: str) -> None:
        self._http.request("DELETE", f"/api/v1/auth/api-keys/{key_id}")


class AsyncOrdersResource:
    """Async variant — sufficient surface for the most common flows."""

    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def create(self, **payload: Any) -> Order:
        return Order.from_dict(await self._http.request("POST", "/api/v1/orders", json=payload) or {})

    async def get(self, order_id: str) -> Order:
        return Order.from_dict(await self._http.request("GET", f"/api/v1/orders/{order_id}") or {})

    async def cancel(self, order_id: str) -> Order:
        return Order.from_dict(await self._http.request("DELETE", f"/api/v1/orders/{order_id}") or {})


class AsyncHtlcsResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def create(self, **payload: Any) -> Htlc:
        return Htlc.from_dict(await self._http.request("POST", "/api/v1/htlcs", json=payload) or {})

    async def claim(self, htlc_id: str, *, secret: str, claimer_address: str) -> Htlc:
        return Htlc.from_dict(
            await self._http.request(
                "POST",
                f"/api/v1/htlcs/{htlc_id}/claim",
                json={"secret": secret, "claimer_address": claimer_address},
            )
            or {}
        )


class AsyncSwapsResource:
    def __init__(self, http: AsyncHttpClient) -> None:
        self._http = http

    async def get(self, swap_id: str) -> Swap:
        return Swap.from_dict(await self._http.request("GET", f"/api/v1/swaps/{swap_id}") or {})
