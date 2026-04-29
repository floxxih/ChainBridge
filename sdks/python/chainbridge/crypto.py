"""HTLC crypto helpers — secret/preimage and hash-lock derivation."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Tuple


def generate_secret(byte_length: int = 32) -> str:
    """Return a cryptographically secure hex-encoded secret."""

    return secrets.token_hex(byte_length)


def derive_hash_lock(secret_hex: str) -> str:
    """Compute the SHA-256 hash-lock from a hex-encoded secret."""

    return hashlib.sha256(bytes.fromhex(secret_hex)).hexdigest()


def verify_secret(secret_hex: str, hash_lock_hex: str) -> bool:
    """Constant-time check that ``secret`` hashes to ``hash_lock_hex``."""

    return secrets.compare_digest(derive_hash_lock(secret_hex), hash_lock_hex.lower())


def expiry_from_now(seconds: int, *, now: datetime | None = None) -> str:
    """Return an ISO-8601 UTC timestamp `seconds` in the future."""

    base = now or datetime.now(tz=timezone.utc)
    return (base + timedelta(seconds=seconds)).isoformat().replace("+00:00", "Z")


def recommended_timelocks(total_seconds: int) -> Tuple[int, int]:
    """Return ``(source, destination)`` timelock seconds.

    The destination side gets half of the source duration to prevent the
    "free option" attack described in the HTLC literature.
    """

    return total_seconds, total_seconds // 2
