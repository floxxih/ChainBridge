"""Tests for Solana proof verification helpers."""

import json

import pytest
from nacl.signing import SigningKey

from app.utils.solana import SolanaVerificationError, verify_solana_proof

_B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"


def _b58encode(raw: bytes) -> str:
    number = int.from_bytes(raw, "big")
    encoded = ""
    while number:
        number, remainder = divmod(number, 58)
        encoded = _B58_ALPHABET[remainder] + encoded
    padding = 0
    for byte in raw:
        if byte == 0:
            padding += 1
        else:
            break
    return ("1" * padding) + (encoded or "1")


def build_payload():
    signing_key = SigningKey.generate()
    message = {
        "swap_id": "swap-1",
        "instruction": "claim",
        "accounts": ["Vote111111111111111111111111111111111111111"],
    }
    message_bytes = json.dumps(message, separators=(",", ":"), sort_keys=True).encode(
        "utf-8"
    )
    signature = signing_key.sign(message_bytes).signature
    return json.dumps(
        {
            "signature": _b58encode(signature),
            "public_key": _b58encode(signing_key.verify_key.encode()),
            "message": message,
            "slot": 123,
            "commitment": "finalized",
            "finalized": True,
            "program_id": "Vote111111111111111111111111111111111111111",
            "accounts": ["Vote111111111111111111111111111111111111111"],
            "required_accounts": ["Vote111111111111111111111111111111111111111"],
        }
    )


def test_verify_solana_proof_accepts_valid_payload():
    result = verify_solana_proof(
        build_payload(),
        expected_program_id="Vote111111111111111111111111111111111111111",
    )
    assert result["commitment"] == "finalized"
    assert result["accounts_verified"] == 1


def test_verify_solana_proof_rejects_wrong_program_id():
    with pytest.raises(SolanaVerificationError):
        verify_solana_proof(
            build_payload(),
            expected_program_id="11111111111111111111111111111111",
        )
