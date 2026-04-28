import { shortenHash } from "@/lib/format";

describe("shortenHash", () => {
  it("returns empty string for empty input", () => {
    expect(shortenHash("")).toBe("");
  });

  it("returns the original value when shorter than the threshold", () => {
    expect(shortenHash("0xABCD")).toBe("0xABCD");
    expect(shortenHash("short")).toBe("short");
  });

  it("shortens a typical Ethereum transaction hash with default options", () => {
    const ethHash = "0x1234567890abcdef1234567890abcdef12345678";
    const result = shortenHash(ethHash);
    expect(result).toBe("0x1234…5678");
    expect(result.startsWith(ethHash.slice(0, 6))).toBe(true);
    expect(result.endsWith(ethHash.slice(-4))).toBe(true);
    expect(result).toContain("…");
  });

  it("shortens a Stellar public key with default options", () => {
    const stellarKey = "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK";
    const result = shortenHash(stellarKey);
    expect(result).toBe("GDRXE2…LRKE");
  });

  it("respects custom prefixLength and suffixLength", () => {
    const hash = "0x1234567890abcdef1234567890abcdef12345678";
    expect(shortenHash(hash, { prefixLength: 8, suffixLength: 6 })).toBe("0x123456…345678");
  });

  it("handles prefixLength = 4 and suffixLength = 4", () => {
    const addr = "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK";
    const result = shortenHash(addr, { prefixLength: 4, suffixLength: 4 });
    expect(result).toBe("GDRX…LRKE");
  });

  it("returns original when hash length equals minLength", () => {
    // With default prefixLength=6, suffixLength=4, minLength=13
    const exact = "1234567890123"; // length 13
    expect(shortenHash(exact)).toBe(exact);
  });

  it("shortens a hash that is just over the minLength", () => {
    // 14 chars, minLength = 13, so it should shorten
    const hash = "12345678901234";
    const result = shortenHash(hash);
    expect(result).toBe("123456…1234");
  });

  it("uses the ellipsis character (…) not three dots", () => {
    const hash = "0xabcdef1234567890abcdef1234567890";
    const result = shortenHash(hash);
    expect(result).toContain("…");
    expect(result).not.toContain("...");
  });
});
