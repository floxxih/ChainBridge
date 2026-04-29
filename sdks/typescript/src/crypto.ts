import { randomBytes, createHash } from "crypto";

/**
 * Generate a cryptographically secure 32-byte secret (preimage) for an HTLC.
 * Returns the secret as a hex-encoded string.
 */
export function generateSecret(byteLength = 32): string {
  return randomBytes(byteLength).toString("hex");
}

/**
 * Derive the SHA-256 hash-lock from a hex-encoded secret.
 * The returned value is hex-encoded and matches the API's `hash_lock` format.
 */
export function deriveHashLock(secretHex: string): string {
  const buf = Buffer.from(secretHex, "hex");
  return createHash("sha256").update(buf).digest("hex");
}

/**
 * Verify that a secret matches a given hash-lock.
 */
export function verifySecret(secretHex: string, hashLockHex: string): boolean {
  return deriveHashLock(secretHex) === hashLockHex.toLowerCase();
}

/**
 * Compute an absolute expiry timestamp (ISO 8601) given a duration in seconds.
 */
export function expiryFromNow(seconds: number, now: Date = new Date()): string {
  return new Date(now.getTime() + seconds * 1000).toISOString();
}

/**
 * Recommended timelock split: source chain gets `total`, destination gets `total / 2`.
 * Prevents the "free option" attack where the secret-revealer could stall.
 */
export function recommendedTimelocks(totalSeconds: number): { source: number; destination: number } {
  return {
    source: totalSeconds,
    destination: Math.floor(totalSeconds / 2),
  };
}
