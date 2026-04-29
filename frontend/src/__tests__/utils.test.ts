import { truncateAddress, formatAmount, formatRelativeTime } from "@/lib/utils";

describe("truncateAddress", () => {
  it("returns full address when shorter than 2*chars+3", () => {
    expect(truncateAddress("GABC", 4)).toBe("GABC");
  });

  it("truncates long addresses", () => {
    const addr = "GDRXE2BQUC3AZNPVFSCEZ76NJ3WWL25FYFK6RGZGIEKWE4SOUJ3LNLRK";
    const result = truncateAddress(addr, 4);
    expect(result).toBe("GDRX…LRKE");
    expect(result).toMatch(/^GDRX…/);
    expect(result.endsWith(addr.slice(-4))).toBe(true);
  });
});

describe("formatAmount", () => {
  it("formats numbers with default decimals", () => {
    expect(formatAmount("1000000")).toBe("1,000,000");
  });

  it("returns 0 for NaN input", () => {
    expect(formatAmount("not-a-number")).toBe("0");
  });

  it("accepts number input", () => {
    expect(formatAmount(42.5, 2)).toBe("42.5");
  });
});

describe("formatRelativeTime", () => {
  it("returns 'just now' for recent timestamps", () => {
    expect(formatRelativeTime(new Date())).toBe("just now");
  });

  it("returns minutes ago", () => {
    const d = new Date(Date.now() - 3 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe("3m ago");
  });

  it("returns hours ago", () => {
    const d = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(d)).toBe("2h ago");
  });
});
