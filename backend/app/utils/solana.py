"""Solana proof verification helpers."""

from __future__ import annotations

import json
from typing import Any

from nacl.exceptions import BadSignatureError
from nacl.signing import VerifyKey

_B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_LOOKUP = {char: index for index, char in enumerate(_B58_ALPHABET)}


class SolanaVerificationError(ValueError):
    """Raised when a Solana proof payload fails validation."""


def _b58decode(value: str) -> bytes:
    if not value:
        raise SolanaVerificationError("Base58 value is required")

    number = 0
    for char in value:
        if char not in _B58_LOOKUP:
            raise SolanaVerificationError("Invalid base58 encoding")
        number = number * 58 + _B58_LOOKUP[char]

    decoded = number.to_bytes((number.bit_length() + 7) // 8, "big")
    padding = len(value) - len(value.lstrip("1"))
    return b"\x00" * padding + decoded


def _ensure_pubkey(value: str, label: str) -> str:
    if len(_b58decode(value)) != 32:
        raise SolanaVerificationError(f"{label} must decode to 32 bytes")
    return value


def _canonical_message(message: Any) -> bytes:
    if isinstance(message, str):
        return message.encode("utf-8")
    if isinstance(message, dict):
        return json.dumps(message, separators=(",", ":"), sort_keys=True).encode(
            "utf-8"
        )
    raise SolanaVerificationError("message must be a string or object")


def parse_solana_payload(proof_data: str) -> dict[str, Any]:
    try:
        payload = json.loads(proof_data)
    except json.JSONDecodeError as exc:
        raise SolanaVerificationError("proof_data must be valid JSON") from exc

    if not isinstance(payload, dict):
        raise SolanaVerificationError("proof_data must decode to an object")
    return payload


def verify_solana_proof(
    proof_data: str, *, expected_program_id: str | None = None
) -> dict[str, Any]:
    payload = parse_solana_payload(proof_data)

    signature = payload.get("signature")
    public_key = payload.get("public_key")
    message = payload.get("message")
    slot = payload.get("slot")
    commitment = payload.get("commitment")
    finalized = payload.get("finalized")
    program_id = payload.get("program_id")
    accounts = payload.get("accounts") or []
    required_accounts = payload.get("required_accounts") or []

    if not isinstance(signature, str):
        raise SolanaVerificationError("signature is required")
    if not isinstance(public_key, str):
        raise SolanaVerificationError("public_key is required")
    if message is None:
        raise SolanaVerificationError("message is required")
    if not isinstance(slot, int) or slot <= 0:
        raise SolanaVerificationError("slot must be a positive integer")

    _ensure_pubkey(public_key, "public_key")
    if program_id:
        _ensure_pubkey(program_id, "program_id")
    for account in accounts:
        _ensure_pubkey(account, "account")
    for account in required_accounts:
        _ensure_pubkey(account, "required account")

    if expected_program_id and program_id != expected_program_id:
        raise SolanaVerificationError(
            "program_id does not match configured bridge program"
        )
    if commitment != "finalized" and finalized is not True:
        raise SolanaVerificationError("proof must reference a finalized Solana slot")
    if required_accounts and not set(required_accounts).issubset(set(accounts)):
        raise SolanaVerificationError("required account proof is incomplete")

    message_bytes = _canonical_message(message)
    signature_bytes = _b58decode(signature)
    if len(signature_bytes) != 64:
        raise SolanaVerificationError("signature must decode to 64 bytes")

    try:
        VerifyKey(_b58decode(public_key)).verify(message_bytes, signature_bytes)
    except BadSignatureError as exc:
        raise SolanaVerificationError("signature verification failed") from exc

    if isinstance(message, dict):
        if not message.get("instruction"):
            raise SolanaVerificationError("message.instruction is required")
        if not message.get("swap_id"):
            raise SolanaVerificationError("message.swap_id is required")

    return {
        "signer": public_key,
        "slot": slot,
        "program_id": program_id,
        "commitment": commitment or "finalized",
        "accounts_verified": len(required_accounts),
    }
