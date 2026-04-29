import { createHash } from "crypto";
import {
  deriveHashLock,
  expiryFromNow,
  generateSecret,
  recommendedTimelocks,
  verifySecret,
} from "../src/crypto";

describe("crypto helpers", () => {
  test("generateSecret returns a 32-byte hex string by default", () => {
    const s = generateSecret();
    expect(s).toMatch(/^[0-9a-f]{64}$/);
  });

  test("deriveHashLock matches sha256(secret)", () => {
    const secret = "deadbeef".repeat(8);
    const expected = createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex");
    expect(deriveHashLock(secret)).toBe(expected);
  });

  test("verifySecret returns true for matching secret/hash pair", () => {
    const secret = generateSecret();
    expect(verifySecret(secret, deriveHashLock(secret))).toBe(true);
  });

  test("verifySecret rejects mismatched secret", () => {
    const a = generateSecret();
    const b = generateSecret();
    expect(verifySecret(a, deriveHashLock(b))).toBe(false);
  });

  test("expiryFromNow adds the requested seconds", () => {
    const base = new Date("2026-04-29T00:00:00Z");
    expect(expiryFromNow(3600, base)).toBe("2026-04-29T01:00:00.000Z");
  });

  test("recommendedTimelocks splits source vs destination", () => {
    expect(recommendedTimelocks(86400)).toEqual({ source: 86400, destination: 43200 });
  });
});
