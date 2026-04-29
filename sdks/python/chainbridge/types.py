"""Type definitions for the ChainBridge SDK."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Chain = Literal["stellar", "bitcoin", "ethereum", "solana"]
OrderStatus = Literal["open", "matched", "cancelled", "expired", "completed"]
SwapStatus = Literal["initiated", "locked", "claimed", "completed", "refunded", "failed"]
HtlcStatus = Literal["active", "claimed", "refunded", "expired"]


@dataclass
class Order:
    order_id: str
    from_chain: str
    to_chain: str
    from_asset: str
    to_asset: str
    from_amount: str
    to_amount: str
    creator: str
    status: str
    expiry: str
    created_at: str
    hash_lock: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Order":
        return cls(
            order_id=data.get("order_id", ""),
            from_chain=data.get("from_chain", ""),
            to_chain=data.get("to_chain", ""),
            from_asset=data.get("from_asset", ""),
            to_asset=data.get("to_asset", ""),
            from_amount=data.get("from_amount", ""),
            to_amount=data.get("to_amount", ""),
            creator=data.get("creator", data.get("sender_address", "")),
            status=data.get("status", ""),
            expiry=data.get("expiry", data.get("expires_at", "")),
            created_at=data.get("created_at", ""),
            hash_lock=data.get("hash_lock"),
            raw=data,
        )


@dataclass
class Htlc:
    htlc_id: str
    sender: str
    receiver: str
    amount: str
    hash_lock: str
    time_lock: str
    status: str
    created_at: str
    tx_hash: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Htlc":
        return cls(
            htlc_id=data.get("htlc_id", ""),
            sender=data.get("sender", data.get("sender_address", "")),
            receiver=data.get("receiver", data.get("receiver_address", "")),
            amount=data.get("amount", ""),
            hash_lock=data.get("hash_lock", ""),
            time_lock=data.get("time_lock", data.get("expires_at", "")),
            status=data.get("status", ""),
            created_at=data.get("created_at", ""),
            tx_hash=data.get("tx_hash"),
            raw=data,
        )


@dataclass
class Swap:
    swap_id: str
    order_id: str
    from_chain: str
    to_chain: str
    status: str
    created_at: str
    completed_at: Optional[str] = None
    from_htlc_id: Optional[str] = None
    to_htlc_tx: Optional[str] = None
    raw: Dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Swap":
        return cls(
            swap_id=data.get("swap_id", ""),
            order_id=data.get("order_id", ""),
            from_chain=data.get("from_chain", ""),
            to_chain=data.get("to_chain", ""),
            status=data.get("status", ""),
            created_at=data.get("created_at", ""),
            completed_at=data.get("completed_at"),
            from_htlc_id=data.get("from_htlc_id"),
            to_htlc_tx=data.get("to_htlc_tx"),
            raw=data,
        )


@dataclass
class Asset:
    id: str
    chain: str
    symbol: str
    name: str
    decimals: int
    is_verified: bool
    is_active: bool

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Asset":
        return cls(
            id=data.get("id", ""),
            chain=data.get("chain", ""),
            symbol=data.get("symbol", ""),
            name=data.get("name", ""),
            decimals=int(data.get("decimals", 0)),
            is_verified=bool(data.get("is_verified", False)),
            is_active=bool(data.get("is_active", True)),
        )


@dataclass
class FeeEstimate:
    chain: str
    base_fee: int
    fee_unit: str
    estimated_seconds: int


@dataclass
class FeeBreakdown:
    network_fees: Dict[str, int]
    protocol_fee_bps: int
    total_fee_usd: str


@dataclass
class VolumeStats:
    total_volume: str
    volume_by_chain: Dict[str, str]
    volume_by_asset: Dict[str, str]
    swap_count: int
    period: str


@dataclass
class SuccessRateStats:
    success_rate: float
    total_swaps: int
    successful_swaps: int
    failed_swaps: int
    expired_swaps: int
    period: str


@dataclass
class WsEvent:
    type: str
    data: Dict[str, Any]


@dataclass
class OrderListPage:
    orders: List[Order]
    page: int
    limit: int
    total: int
    pages: int
