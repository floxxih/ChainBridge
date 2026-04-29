"""Wallet integration helpers — chain-agnostic protocol."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Optional, Protocol, runtime_checkable


@dataclass
class WalletConnection:
    chain: str
    address: str
    public_key: Optional[str] = None


@dataclass
class HtlcLockParams:
    receiver: str
    amount: str
    hash_lock: str
    time_lock_seconds: int
    asset: Optional[str] = None


@runtime_checkable
class WalletAdapter(Protocol):
    chain: str

    def connect(self) -> WalletConnection: ...
    def is_connected(self) -> bool: ...
    def get_address(self) -> str: ...
    def sign_transaction(self, tx: Any) -> Any: ...
    def disconnect(self) -> None: ...


@runtime_checkable
class HtlcWalletAdapter(WalletAdapter, Protocol):
    """Adapter capable of locking, claiming, and refunding HTLCs."""

    def lock_htlc(self, params: HtlcLockParams) -> str: ...
    def claim_htlc(self, htlc_ref: str, secret: str) -> str: ...
    def refund_htlc(self, htlc_ref: str) -> str: ...


class StubWallet:
    """In-memory adapter useful for tests and dry-runs."""

    def __init__(self, chain: str, address: str) -> None:
        self.chain = chain
        self._address = address
        self._connected = True

    def connect(self) -> WalletConnection:
        return WalletConnection(chain=self.chain, address=self._address)

    def is_connected(self) -> bool:
        return self._connected

    def get_address(self) -> str:
        return self._address

    def sign_transaction(self, tx: Any) -> Any:
        return {"signed": True, "raw": tx}

    def disconnect(self) -> None:
        self._connected = False

    def lock_htlc(self, params: HtlcLockParams) -> str:
        return f"stub-tx:{params.hash_lock[:8]}"

    def claim_htlc(self, htlc_ref: str, secret: str) -> str:
        return f"stub-claim:{htlc_ref}:{secret[:8]}"

    def refund_htlc(self, htlc_ref: str) -> str:
        return f"stub-refund:{htlc_ref}"
