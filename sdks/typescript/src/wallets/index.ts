/**
 * Wallet integration helpers.
 *
 * These helpers describe a thin, consistent interface across chains so callers
 * can plug in any backing wallet implementation (Freighter, MetaMask, Phantom,
 * a hardware key, etc.) without leaking the underlying SDK throughout the
 * application.
 */

import type { Chain } from "../types";

export interface WalletConnection {
  chain: Chain;
  address: string;
  publicKey?: string;
}

export interface SignedTransaction {
  txHash?: string;
  envelopeXdr?: string;
  signedTx?: string;
  raw: unknown;
}

export interface WalletAdapter {
  readonly chain: Chain;
  connect(): Promise<WalletConnection>;
  isConnected(): boolean;
  getAddress(): Promise<string>;
  signTransaction(tx: unknown): Promise<SignedTransaction>;
  disconnect(): Promise<void>;
}

export interface HtlcLockParams {
  receiver: string;
  amount: string;
  hashLock: string;
  timeLockSeconds: number;
  asset?: string;
}

export interface HtlcWalletAdapter extends WalletAdapter {
  /**
   * Lock funds in an HTLC on the chain. Returns the chain-native transaction id.
   */
  lockHtlc(params: HtlcLockParams): Promise<{ txHash: string }>;

  /**
   * Reveal a secret to claim a previously-locked HTLC.
   */
  claimHtlc(htlcRef: string, secret: string): Promise<{ txHash: string }>;

  /**
   * Refund an expired HTLC.
   */
  refundHtlc(htlcRef: string): Promise<{ txHash: string }>;
}

/**
 * Browser detection for Stellar's Freighter wallet.
 * Returns null when not present (e.g., during server-side rendering).
 */
export function detectFreighter(): { isAvailable: boolean } {
  const w = typeof globalThis !== "undefined" ? (globalThis as unknown as { freighterApi?: unknown }) : undefined;
  return { isAvailable: !!w?.freighterApi };
}

/**
 * Browser detection for an EVM injected provider (MetaMask, etc.).
 */
export function detectEvmProvider(): { isAvailable: boolean } {
  const w = typeof globalThis !== "undefined" ? (globalThis as unknown as { ethereum?: unknown }) : undefined;
  return { isAvailable: !!w?.ethereum };
}

export class StubWalletAdapter implements WalletAdapter {
  constructor(public readonly chain: Chain, private address: string) {}
  async connect() {
    return { chain: this.chain, address: this.address };
  }
  isConnected() {
    return true;
  }
  async getAddress() {
    return this.address;
  }
  async signTransaction(tx: unknown): Promise<SignedTransaction> {
    return { raw: tx };
  }
  async disconnect() {
    return;
  }
}

export type { Chain } from "../types";
