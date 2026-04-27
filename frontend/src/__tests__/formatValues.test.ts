import {
  formatCompactValue,
  formatFiatEstimate,
  formatPercent,
  formatTokenAmount,
  formatTokenWithSymbol,
} from "@/lib/format";

describe("formatTokenAmount", () => {
  it("respects maximumFractionDigits", () => {
    expect(formatTokenAmount(1.23456789, { maximumFractionDigits: 4 })).toBe("1.2346");
  });

  it("returns 0 for invalid input", () => {
    expect(formatTokenAmount("x", {})).toBe("0");
  });
});

describe("formatTokenWithSymbol", () => {
  it("appends symbol", () => {
    expect(formatTokenWithSymbol(12.5, "XLM", { maximumFractionDigits: 2 })).toBe("12.5 XLM");
  });
});

describe("formatFiatEstimate", () => {
  it("formats USD by default", () => {
    expect(formatFiatEstimate(42.7)).toMatch(/\$42\.70/);
  });
});

describe("formatCompactValue", () => {
  it("uses compact notation for large values", () => {
    const s = formatCompactValue(2_500_000_000);
    expect(s).toMatch(/2\.5|2,5/);
    expect(s.toLowerCase()).toContain("b");
  });

  it("uses scientific notation for very small magnitudes", () => {
    const s = formatCompactValue(3.1e-12);
    expect(s).toContain("e");
  });
});

describe("formatPercent", () => {
  it("formats a fractional value as percent", () => {
    expect(formatPercent(0.0125, { fractionDigits: 2 })).toBe("1.25%");
  });
});
