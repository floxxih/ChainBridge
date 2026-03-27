"""Multi-chain address validation (#61).

Supports Stellar (G-address, C-address), Bitcoin (P2PKH, P2SH, Bech32,
Bech32m / Taproot), Ethereum (0x hex, EIP-55 checksum), and Solana.
"""

from __future__ import annotations

import hashlib
import re
from enum import Enum
from typing import Optional

from Crypto.Hash import keccak
from stellar_sdk import Keypair
from stellar_sdk.exceptions import Ed25519PublicKeyInvalidError

# ---------------------------------------------------------------------------
# Types
# ---------------------------------------------------------------------------

SUPPORTED_CHAINS = {"stellar", "ethereum", "bitcoin", "solana"}


class AddressFormat(str, Enum):
    # Stellar
    STELLAR_ACCOUNT = "stellar_account"
    STELLAR_CONTRACT = "stellar_contract"
    # Bitcoin
    BITCOIN_P2PKH = "bitcoin_p2pkh"
    BITCOIN_P2SH = "bitcoin_p2sh"
    BITCOIN_BECH32 = "bitcoin_bech32"
    BITCOIN_BECH32M = "bitcoin_bech32m"
    # Ethereum
    ETHEREUM = "ethereum"
    ETHEREUM_CHECKSUMMED = "ethereum_checksummed"
    # Solana
    SOLANA = "solana"


class ValidationResult:
    __slots__ = ("valid", "chain", "address_format", "error")

    def __init__(
        self,
        valid: bool,
        chain: Optional[str] = None,
        address_format: Optional[AddressFormat] = None,
        error: Optional[str] = None,
    ):
        self.valid = valid
        self.chain = chain
        self.address_format = address_format
        self.error = error

    def to_dict(self) -> dict:
        return {
            "valid": self.valid,
            "chain": self.chain,
            "address_format": (
                self.address_format.value if self.address_format else None
            ),
            "error": self.error,
        }


# ---------------------------------------------------------------------------
# Stellar
# ---------------------------------------------------------------------------


def validate_stellar_address(address: str) -> ValidationResult:
    """Validate a Stellar G-address (account) or C-address (contract)."""
    if not isinstance(address, str) or not address:
        return ValidationResult(
            False, "stellar", error="Address must be a non-empty string"
        )

    # Contract address (C...)
    if address.startswith("C"):
        if len(address) != 56:
            return ValidationResult(
                False, "stellar", error="Stellar contract address must be 56 characters"
            )
        if not re.fullmatch(r"C[A-Z2-7]{55}", address):
            return ValidationResult(
                False, "stellar", error="Invalid Stellar contract address encoding"
            )
        return ValidationResult(True, "stellar", AddressFormat.STELLAR_CONTRACT)

    # Account address (G...)
    if not address.startswith("G"):
        return ValidationResult(
            False,
            "stellar",
            error="Stellar address must start with 'G' (account) or 'C' (contract)",
        )

    try:
        Keypair.from_public_key(address)
    except (Ed25519PublicKeyInvalidError, Exception):
        return ValidationResult(
            False, "stellar", error="Invalid Stellar account address (checksum failed)"
        )

    return ValidationResult(True, "stellar", AddressFormat.STELLAR_ACCOUNT)


# ---------------------------------------------------------------------------
# Bitcoin – Base58Check
# ---------------------------------------------------------------------------

_B58_ALPHABET = b"123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_MAP = {c: i for i, c in enumerate(_B58_ALPHABET)}


def _b58decode_check(s: str) -> Optional[bytes]:
    """Decode a Base58Check string and verify the 4-byte checksum."""
    try:
        raw = 0
        for ch in s.encode("ascii"):
            if ch not in _B58_MAP:
                return None
            raw = raw * 58 + _B58_MAP[ch]
        # Convert integer to bytes – include leading zero bytes
        byte_length = (raw.bit_length() + 7) // 8
        data = raw.to_bytes(byte_length, "big") if byte_length else b""
        # Re-add leading 1s → 0x00 bytes
        pad = 0
        for ch in s.encode("ascii"):
            if ch == 0x31:  # '1'
                pad += 1
            else:
                break
        data = b"\x00" * pad + data
        payload, checksum = data[:-4], data[-4:]
        expected = hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4]
        return payload if checksum == expected else None
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Bitcoin – Bech32 / Bech32m
# ---------------------------------------------------------------------------

_BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l"
_BECH32_CONST = 1
_BECH32M_CONST = 0x2BC830A3


def _bech32_polymod(values: list[int]) -> int:
    gen = [0x3B6A57B2, 0x26508E6D, 0x1EA119FA, 0x3D4233DD, 0x2A1462B3]
    chk = 1
    for v in values:
        b = chk >> 25
        chk = ((chk & 0x1FFFFFF) << 5) ^ v
        for i in range(5):
            chk ^= gen[i] if ((b >> i) & 1) else 0
    return chk


def _bech32_hrp_expand(hrp: str) -> list[int]:
    return [ord(c) >> 5 for c in hrp] + [0] + [ord(c) & 31 for c in hrp]


def _bech32_verify(hrp: str, data: list[int]) -> str | None:
    """Return 'bech32' or 'bech32m' if valid, else None."""
    poly = _bech32_polymod(_bech32_hrp_expand(hrp) + data)
    if poly == _BECH32_CONST:
        return "bech32"
    if poly == _BECH32M_CONST:
        return "bech32m"
    return None


def _bech32_decode(bech: str) -> tuple[Optional[str], Optional[int], Optional[bytes]]:
    """Decode a bech32/bech32m string. Returns (hrp, witness_version, program) or (None,None,None)."""
    if any(ord(c) < 33 or ord(c) > 126 for c in bech):
        return None, None, None
    if bech.lower() != bech and bech.upper() != bech:
        return None, None, None
    bech = bech.lower()
    pos = bech.rfind("1")
    if pos < 1 or pos + 7 > len(bech) or len(bech) > 90:
        return None, None, None
    hrp = bech[:pos]
    data_part = bech[pos + 1 :]
    data = []
    for c in data_part:
        idx = _BECH32_CHARSET.find(c)
        if idx == -1:
            return None, None, None
        data.append(idx)
    encoding = _bech32_verify(hrp, data)
    if encoding is None:
        return None, None, None

    # Witness version + program
    witness_version = data[0]
    # Convert 5-bit groups to 8-bit
    acc = 0
    bits = 0
    program = []
    for v in data[1:-6]:
        acc = (acc << 5) | v
        bits += 5
        while bits >= 8:
            bits -= 8
            program.append((acc >> bits) & 0xFF)
    if bits >= 5 or (acc << (8 - bits)) & 0xFF:
        return None, None, None

    prog_bytes = bytes(program)

    # BIP-141 constraints
    if len(prog_bytes) < 2 or len(prog_bytes) > 40:
        return None, None, None
    if witness_version == 0 and len(prog_bytes) not in (20, 32):
        return None, None, None
    if witness_version == 0 and encoding != "bech32":
        return None, None, None
    if witness_version >= 1 and encoding != "bech32m":
        return None, None, None
    if witness_version > 16:
        return None, None, None

    return hrp, witness_version, prog_bytes


# ---------------------------------------------------------------------------
# Bitcoin – combined validator
# ---------------------------------------------------------------------------

# Mainnet prefixes:  "1" / "3" for Base58Check, "bc1" for segwit
# Testnet prefixes:  "m" / "n" / "2" for Base58Check, "tb1" for segwit

_BITCOIN_BASE58_MAINNET = {
    0x00: AddressFormat.BITCOIN_P2PKH,
    0x05: AddressFormat.BITCOIN_P2SH,
}
_BITCOIN_BASE58_TESTNET = {
    0x6F: AddressFormat.BITCOIN_P2PKH,
    0xC4: AddressFormat.BITCOIN_P2SH,
}


def validate_bitcoin_address(
    address: str, *, network: str = "mainnet"
) -> ValidationResult:
    """Validate a Bitcoin address (Legacy, SegWit, Taproot)."""
    if not isinstance(address, str) or not address:
        return ValidationResult(
            False, "bitcoin", error="Address must be a non-empty string"
        )

    # Bech32 / Bech32m
    expected_hrp = "bc" if network == "mainnet" else "tb"
    if address.lower().startswith(expected_hrp + "1"):
        hrp, witness_version, program = _bech32_decode(address)
        if hrp is None or hrp != expected_hrp:
            return ValidationResult(
                False,
                "bitcoin",
                error="Invalid Bitcoin bech32 address (checksum failed)",
            )
        if witness_version == 0:
            fmt = AddressFormat.BITCOIN_BECH32
        else:
            fmt = AddressFormat.BITCOIN_BECH32M
        return ValidationResult(True, "bitcoin", fmt)

    # Base58Check
    decoded = _b58decode_check(address)
    if decoded is None or len(decoded) != 21:
        return ValidationResult(
            False, "bitcoin", error="Invalid Bitcoin address (base58 checksum failed)"
        )
    version_byte = decoded[0]
    version_map = (
        _BITCOIN_BASE58_MAINNET if network == "mainnet" else _BITCOIN_BASE58_TESTNET
    )
    fmt = version_map.get(version_byte)
    if fmt is None:
        return ValidationResult(
            False,
            "bitcoin",
            error=f"Unrecognised Bitcoin address version byte 0x{version_byte:02X} for {network}",
        )
    return ValidationResult(True, "bitcoin", fmt)


# ---------------------------------------------------------------------------
# Ethereum
# ---------------------------------------------------------------------------

_ETH_ADDR_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")


def _eip55_checksum(address: str) -> str:
    """Compute EIP-55 mixed-case checksum encoding."""
    addr = address[2:].lower()
    digest = keccak.new(digest_bits=256)
    digest.update(addr.encode("ascii"))
    hash_hex = digest.hexdigest()
    out = "0x"
    for i, ch in enumerate(addr):
        if ch in "0123456789":
            out += ch
        elif int(hash_hex[i], 16) >= 8:
            out += ch.upper()
        else:
            out += ch.lower()
    return out


def validate_ethereum_address(address: str) -> ValidationResult:
    """Validate an Ethereum address (with optional EIP-55 checksum)."""
    if not isinstance(address, str) or not address:
        return ValidationResult(
            False, "ethereum", error="Address must be a non-empty string"
        )

    if not _ETH_ADDR_RE.match(address):
        if address.startswith("0x"):
            return ValidationResult(
                False,
                "ethereum",
                error="Ethereum address must be 40 hex characters after '0x'",
            )
        return ValidationResult(
            False, "ethereum", error="Ethereum address must start with '0x'"
        )

    # If all-lower or all-upper, it's valid but not checksummed
    hex_part = address[2:]
    if hex_part == hex_part.lower():
        return ValidationResult(True, "ethereum", AddressFormat.ETHEREUM)

    if hex_part == hex_part.upper():
        if _eip55_checksum(address) == address:
            return ValidationResult(
                True, "ethereum", AddressFormat.ETHEREUM_CHECKSUMMED
            )
        return ValidationResult(True, "ethereum", AddressFormat.ETHEREUM)

    # Mixed-case → verify EIP-55
    if _eip55_checksum(address) != address:
        return ValidationResult(False, "ethereum", error="Invalid EIP-55 checksum")

    return ValidationResult(True, "ethereum", AddressFormat.ETHEREUM_CHECKSUMMED)


def to_checksum_address(address: str) -> str:
    """Convert an Ethereum address to EIP-55 checksummed form.

    Raises ValueError for invalid addresses.
    """
    result = validate_ethereum_address(address)
    if not result.valid:
        raise ValueError(result.error)
    return _eip55_checksum(address)


# ---------------------------------------------------------------------------
# Unified API
# ---------------------------------------------------------------------------

_CHAIN_VALIDATORS = {
    "stellar": validate_stellar_address,
    "ethereum": validate_ethereum_address,
    "bitcoin": validate_bitcoin_address,
}


def validate_solana_address(address: str) -> ValidationResult:
    """Validate a Solana public key encoded in base58."""
    if not isinstance(address, str) or not address:
        return ValidationResult(
            False, "solana", error="Address must be a non-empty string"
        )
    try:
        raw = 0
        for char in address.encode("ascii"):
            if char not in _B58_MAP:
                return ValidationResult(
                    False, "solana", error="Invalid Solana base58 character"
                )
            raw = raw * 58 + _B58_MAP[char]
        decoded = raw.to_bytes((raw.bit_length() + 7) // 8, "big") if raw else b""
        padding = 0
        for char in address:
            if char == "1":
                padding += 1
            else:
                break
        decoded = (b"\x00" * padding) + decoded
    except Exception:
        return ValidationResult(
            False, "solana", error="Invalid Solana address encoding"
        )

    if len(decoded) != 32:
        return ValidationResult(
            False, "solana", error="Solana address must decode to 32 bytes"
        )
    return ValidationResult(True, "solana", AddressFormat.SOLANA)


_CHAIN_VALIDATORS["solana"] = validate_solana_address


def validate_address(address: str, chain: str, **kwargs) -> ValidationResult:
    """Validate an address for a specific chain.

    Kwargs are forwarded to the chain-specific validator (e.g. ``network``
    for Bitcoin).
    """
    chain = chain.lower()
    validator = _CHAIN_VALIDATORS.get(chain)
    if validator is None:
        return ValidationResult(False, chain, error=f"Unsupported chain: {chain}")
    return validator(address, **kwargs)


def detect_address_chain(address: str) -> ValidationResult:
    """Attempt to detect which chain an address belongs to."""
    if not isinstance(address, str) or not address:
        return ValidationResult(False, error="Address must be a non-empty string")

    # Stellar
    if address.startswith("G") or address.startswith("C"):
        return validate_stellar_address(address)

    # Ethereum
    if address.startswith("0x") or address.startswith("0X"):
        return validate_ethereum_address(address)

    # Bitcoin bech32/bech32m
    lower = address.lower()
    if lower.startswith("bc1") or lower.startswith("tb1"):
        network = "testnet" if lower.startswith("tb1") else "mainnet"
        return validate_bitcoin_address(address, network=network)

    # Bitcoin base58 (starts with 1, 3, m, n, 2)
    if address[0] in "13":
        return validate_bitcoin_address(address, network="mainnet")
    if address[0] in "mn2":
        return validate_bitcoin_address(address, network="testnet")

    # Solana public keys are base58-encoded 32-byte values.
    solana_result = validate_solana_address(address)
    if solana_result.valid:
        return solana_result

    return ValidationResult(False, error="Unable to detect chain for address")
