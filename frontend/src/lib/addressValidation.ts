/**
 * Multi-chain address validation utilities (#61).
 *
 * Supports Stellar (G/C-address), Bitcoin (P2PKH, P2SH, Bech32, Taproot),
 * and Ethereum (0x hex with EIP-55 checksum).
 */

import { ethers } from "ethers";
import * as bitcoin from "bitcoinjs-lib";
import { StrKey } from "@stellar/stellar-sdk";
import type { ChainType } from "@/types/wallet";

// ── Types ────────────────────────────────────────────────────────────

export type AddressFormat =
  | "stellar_account"
  | "stellar_contract"
  | "bitcoin_p2pkh"
  | "bitcoin_p2sh"
  | "bitcoin_bech32"
  | "bitcoin_bech32m"
  | "ethereum"
  | "ethereum_checksummed";

export interface ValidationResult {
  valid: boolean;
  chain?: ChainType;
  format?: AddressFormat;
  error?: string;
}

// ── Stellar ──────────────────────────────────────────────────────────

export function validateStellarAddress(address: string): ValidationResult {
  if (!address) {
    return { valid: false, chain: "stellar", error: "Address must be a non-empty string" };
  }

  // Contract address (C...)
  if (address.startsWith("C")) {
    if (address.length !== 56 || !/^C[A-Z2-7]{55}$/.test(address)) {
      return { valid: false, chain: "stellar", error: "Invalid Stellar contract address" };
    }
    return { valid: true, chain: "stellar", format: "stellar_contract" };
  }

  if (!address.startsWith("G")) {
    return {
      valid: false,
      chain: "stellar",
      error: "Stellar address must start with 'G' (account) or 'C' (contract)",
    };
  }

  if (!StrKey.isValidEd25519PublicKey(address)) {
    return {
      valid: false,
      chain: "stellar",
      error: "Invalid Stellar account address (checksum failed)",
    };
  }

  return { valid: true, chain: "stellar", format: "stellar_account" };
}

// ── Bitcoin ──────────────────────────────────────────────────────────

function getBtcNetwork(): bitcoin.Network {
  return process.env.NEXT_PUBLIC_BITCOIN_NETWORK === "mainnet"
    ? bitcoin.networks.bitcoin
    : bitcoin.networks.testnet;
}

function classifyBitcoinFormat(address: string): AddressFormat {
  const lower = address.toLowerCase();
  if (lower.startsWith("bc1p") || lower.startsWith("tb1p")) return "bitcoin_bech32m";
  if (lower.startsWith("bc1q") || lower.startsWith("tb1q")) return "bitcoin_bech32";
  if (address.startsWith("3") || address.startsWith("2")) return "bitcoin_p2sh";
  return "bitcoin_p2pkh";
}

export function validateBitcoinAddress(address: string): ValidationResult {
  if (!address) {
    return { valid: false, chain: "bitcoin", error: "Address must be a non-empty string" };
  }

  try {
    const network = getBtcNetwork();
    bitcoin.address.toOutputScript(address, network);
    return { valid: true, chain: "bitcoin", format: classifyBitcoinFormat(address) };
  } catch {
    return { valid: false, chain: "bitcoin", error: "Invalid Bitcoin address" };
  }
}

// ── Ethereum ─────────────────────────────────────────────────────────

export function validateEthereumAddress(address: string): ValidationResult {
  if (!address) {
    return { valid: false, chain: "ethereum", error: "Address must be a non-empty string" };
  }

  if (!address.startsWith("0x")) {
    return { valid: false, chain: "ethereum", error: "Ethereum address must start with '0x'" };
  }

  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return {
      valid: false,
      chain: "ethereum",
      error: "Ethereum address must be 40 hex characters after '0x'",
    };
  }

  const hex = address.slice(2);
  const isAllLower = hex === hex.toLowerCase();
  const isAllUpper = hex === hex.toUpperCase();

  if (isAllLower || isAllUpper) {
    return { valid: true, chain: "ethereum", format: "ethereum" };
  }

  // Mixed-case → verify EIP-55
  if (ethers.getAddress(address) !== address) {
    return { valid: false, chain: "ethereum", error: "Invalid EIP-55 checksum" };
  }

  return { valid: true, chain: "ethereum", format: "ethereum_checksummed" };
}

export function toChecksumAddress(address: string): string {
  const result = validateEthereumAddress(address);
  if (!result.valid) throw new Error(result.error);
  return ethers.getAddress(address);
}

// ── Unified API ──────────────────────────────────────────────────────

const CHAIN_VALIDATORS: Record<ChainType, (addr: string) => ValidationResult> = {
  stellar: validateStellarAddress,
  bitcoin: validateBitcoinAddress,
  ethereum: validateEthereumAddress,
};

export function validateAddress(address: string, chain: ChainType): ValidationResult {
  const validator = CHAIN_VALIDATORS[chain];
  if (!validator) {
    return { valid: false, error: `Unsupported chain: ${chain}` };
  }
  return validator(address);
}

export function detectAddressChain(address: string): ValidationResult {
  if (!address) {
    return { valid: false, error: "Address must be a non-empty string" };
  }

  if (address.startsWith("G") || address.startsWith("C")) {
    return validateStellarAddress(address);
  }

  if (address.startsWith("0x") || address.startsWith("0X")) {
    return validateEthereumAddress(address);
  }

  const lower = address.toLowerCase();
  if (lower.startsWith("bc1") || lower.startsWith("tb1")) {
    return validateBitcoinAddress(address);
  }
  if (/^[13mn2]/.test(address)) {
    return validateBitcoinAddress(address);
  }

  return { valid: false, error: "Unable to detect chain for address" };
}

/** Human-readable error message for address validation failures. */
export function getAddressErrorMessage(chain: ChainType): string {
  switch (chain) {
    case "stellar":
      return "Enter a valid Stellar address starting with G (account) or C (contract)";
    case "bitcoin":
      return "Enter a valid Bitcoin address (Legacy, SegWit, or Taproot)";
    case "ethereum":
      return "Enter a valid Ethereum address starting with 0x";
    default:
      return "Enter a valid address";
  }
}
