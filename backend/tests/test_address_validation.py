"""Tests for multi-chain address validation (#61)."""

import pytest

from app.utils.address_validation import (
    AddressFormat,
    ValidationResult,
    detect_address_chain,
    to_checksum_address,
    validate_address,
    validate_bitcoin_address,
    validate_ethereum_address,
    validate_solana_address,
    validate_stellar_address,
)

# ---------------------------------------------------------------------------
# Stellar
# ---------------------------------------------------------------------------


class TestStellarValidation:
    # Real Stellar public key (testnet faucet)
    VALID_G = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"

    def test_valid_g_address(self):
        r = validate_stellar_address(self.VALID_G)
        assert r.valid is True
        assert r.chain == "stellar"
        assert r.address_format == AddressFormat.STELLAR_ACCOUNT

    def test_g_address_bad_checksum(self):
        bad = self.VALID_G[:-1] + ("A" if self.VALID_G[-1] != "A" else "B")
        r = validate_stellar_address(bad)
        assert r.valid is False
        assert "checksum" in (r.error or "").lower()

    def test_g_address_wrong_length(self):
        r = validate_stellar_address("GABC")
        assert r.valid is False

    def test_valid_c_address(self):
        c_addr = "C" + "A" * 55
        r = validate_stellar_address(c_addr)
        assert r.valid is True
        assert r.address_format == AddressFormat.STELLAR_CONTRACT

    def test_c_address_wrong_length(self):
        r = validate_stellar_address("C" + "A" * 50)
        assert r.valid is False

    def test_c_address_bad_chars(self):
        r = validate_stellar_address("C" + "0" * 55)  # '0' not in base32 alphabet
        assert r.valid is False

    def test_empty_string(self):
        r = validate_stellar_address("")
        assert r.valid is False

    def test_wrong_prefix(self):
        r = validate_stellar_address("Xabc")
        assert r.valid is False


# ---------------------------------------------------------------------------
# Bitcoin
# ---------------------------------------------------------------------------


class TestBitcoinValidation:
    # Mainnet P2PKH (real address)
    P2PKH = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"
    # Mainnet P2SH
    P2SH = "3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy"
    # Mainnet Bech32 (SegWit v0 P2WPKH – 20 byte program)
    BECH32 = "bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4"
    # Mainnet Bech32m (Taproot – witness v1, 32 byte program)
    BECH32M = "bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k2e72q4k9hcz7vqzk5jj0"

    def test_valid_p2pkh(self):
        r = validate_bitcoin_address(self.P2PKH, network="mainnet")
        assert r.valid is True
        assert r.address_format == AddressFormat.BITCOIN_P2PKH

    def test_valid_p2sh(self):
        r = validate_bitcoin_address(self.P2SH, network="mainnet")
        assert r.valid is True
        assert r.address_format == AddressFormat.BITCOIN_P2SH

    def test_valid_bech32(self):
        r = validate_bitcoin_address(self.BECH32, network="mainnet")
        assert r.valid is True
        assert r.address_format == AddressFormat.BITCOIN_BECH32

    def test_valid_bech32m_taproot(self):
        r = validate_bitcoin_address(self.BECH32M, network="mainnet")
        assert r.valid is True
        assert r.address_format == AddressFormat.BITCOIN_BECH32M

    def test_bad_base58_checksum(self):
        bad = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNb"  # last char changed
        r = validate_bitcoin_address(bad, network="mainnet")
        assert r.valid is False

    def test_bad_bech32_checksum(self):
        bad = self.BECH32[:-1] + "x"
        r = validate_bitcoin_address(bad, network="mainnet")
        assert r.valid is False

    def test_empty(self):
        r = validate_bitcoin_address("", network="mainnet")
        assert r.valid is False

    def test_testnet_p2pkh_rejected_on_mainnet(self):
        # Testnet P2PKH starts with m/n – version byte 0x6F
        r = validate_bitcoin_address(
            "mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn", network="mainnet"
        )
        assert r.valid is False

    def test_testnet_bech32_rejected_on_mainnet(self):
        r = validate_bitcoin_address(
            "tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx", network="mainnet"
        )
        assert r.valid is False


# ---------------------------------------------------------------------------
# Ethereum
# ---------------------------------------------------------------------------


class TestEthereumValidation:
    VALID_LOWER = "0x52908400098527886e0f7030069857d2e4169ee7"
    VALID_UPPER = "0x52908400098527886E0F7030069857D2E4169EE7"
    VALID_CHECKSUM = "0x52908400098527886E0F7030069857D2E4169EE7"

    def test_valid_lowercase(self):
        r = validate_ethereum_address(self.VALID_LOWER)
        assert r.valid is True
        assert r.address_format == AddressFormat.ETHEREUM

    def test_valid_uppercase(self):
        r = validate_ethereum_address(self.VALID_UPPER)
        assert r.valid is True
        assert r.address_format in (
            AddressFormat.ETHEREUM,
            AddressFormat.ETHEREUM_CHECKSUMMED,
        )

    def test_valid_checksum(self):
        r = validate_ethereum_address(self.VALID_CHECKSUM)
        assert r.valid is True
        assert r.address_format == AddressFormat.ETHEREUM_CHECKSUMMED

    def test_bad_checksum(self):
        # Flip one char's case in a checksummed address
        bad = "0x52908400098527886e0F7030069857D2E4169EE7"
        r = validate_ethereum_address(bad)
        assert r.valid is False
        assert "checksum" in (r.error or "").lower()

    def test_no_0x_prefix(self):
        r = validate_ethereum_address("52908400098527886e0f7030069857d2e4169ee7")
        assert r.valid is False
        assert "0x" in (r.error or "")

    def test_too_short(self):
        r = validate_ethereum_address("0xabc")
        assert r.valid is False

    def test_empty(self):
        r = validate_ethereum_address("")
        assert r.valid is False

    def test_to_checksum(self):
        checksummed = to_checksum_address(self.VALID_LOWER)
        assert checksummed.startswith("0x")
        # Verify it's a valid checksummed address
        r = validate_ethereum_address(checksummed)
        assert r.valid is True

    def test_to_checksum_invalid(self):
        with pytest.raises(ValueError):
            to_checksum_address("invalid")


# ---------------------------------------------------------------------------
# Unified API
# ---------------------------------------------------------------------------


class TestValidateAddress:
    def test_stellar(self):
        r = validate_address(
            "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7", "stellar"
        )
        assert r.valid is True

    def test_ethereum(self):
        r = validate_address("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", "ethereum")
        assert r.valid is True

    def test_bitcoin(self):
        r = validate_address("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa", "bitcoin")
        assert r.valid is True

    def test_solana(self):
        r = validate_address("Vote111111111111111111111111111111111111111", "solana")
        assert r.valid is True

    def test_wrong_chain(self):
        # Ethereum address validated as stellar
        r = validate_address("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae", "stellar")
        assert r.valid is False


# ---------------------------------------------------------------------------
# Detection
# ---------------------------------------------------------------------------


class TestDetectAddressChain:
    def test_detect_stellar(self):
        r = detect_address_chain(
            "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN7"
        )
        assert r.valid is True
        assert r.chain == "stellar"

    def test_detect_ethereum(self):
        r = detect_address_chain("0xde0b295669a9fd93d5f28d9ec85e40f4cb697bae")
        assert r.valid is True
        assert r.chain == "ethereum"

    def test_detect_bitcoin_legacy(self):
        r = detect_address_chain("1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa")
        assert r.valid is True
        assert r.chain == "bitcoin"

    def test_detect_bitcoin_bech32(self):
        r = detect_address_chain("bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4")
        assert r.valid is True
        assert r.chain == "bitcoin"

    def test_detect_empty(self):
        r = detect_address_chain("")
        assert r.valid is False

    def test_detect_unknown(self):
        r = detect_address_chain("zzzznotanaddress")
        assert r.valid is False


class TestSolanaValidation:
    def test_valid_solana_address(self):
        r = validate_solana_address("Vote111111111111111111111111111111111111111")
        assert r.valid is True
        assert r.address_format == AddressFormat.SOLANA

    def test_invalid_solana_address(self):
        r = validate_solana_address("bad-solana-address")
        assert r.valid is False
