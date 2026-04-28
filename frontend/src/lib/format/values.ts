/**
 * Shared number formatting for token amounts, fiat estimates, and compact display.
 * Prefer these helpers over ad-hoc toFixed / toLocaleString in UI components.
 */

export const FORMAT_DEFAULT_LOCALE = "en-US";

export type FormatTokenAmountOptions = {
  locale?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  /** Use `compact` for abbreviated large values (e.g. 1.2M). */
  notation?: "standard" | "compact" | "engineering";
};

function toNumber(value: string | number): number {
  if (typeof value === "number") return value;
  const n = Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : Number.NaN;
}

/** Formats a numeric token/crypto amount with configurable decimal bounds. */
export function formatTokenAmount(
  value: string | number,
  options: FormatTokenAmountOptions = {}
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "0";

  const {
    locale = FORMAT_DEFAULT_LOCALE,
    minimumFractionDigits = 0,
    maximumFractionDigits = 8,
    notation = "standard",
  } = options;

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
    notation,
    ...(notation === "compact" ? { compactDisplay: "short" as const } : {}),
  }).format(n);
}

/** Formats an amount with an asset ticker suffix (e.g. swap summaries). */
export function formatTokenWithSymbol(
  value: string | number,
  symbol: string,
  options?: FormatTokenAmountOptions
): string {
  const amount = formatTokenAmount(value, options);
  return symbol ? `${amount} ${symbol}` : amount;
}

export type FormatFiatEstimateOptions = Omit<FormatTokenAmountOptions, "notation"> & {
  currency?: string;
};

/** Formats a fiat estimate using Intl currency (USD by default). */
export function formatFiatEstimate(
  value: string | number,
  options: FormatFiatEstimateOptions = {}
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "—";

  const {
    locale = FORMAT_DEFAULT_LOCALE,
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(n);
}

export type FormatCompactValueOptions = {
  locale?: string;
  /** Absolute value above which compact notation is used (default 1e9). */
  largeThreshold?: number;
  /** Absolute value below which scientific or high-precision display is used (default 1e-8). */
  tinyThreshold?: number;
};

/**
 * Displays very large numbers in compact notation and very small numbers with
 * scientific notation so they remain readable in tables and cards.
 */
export function formatCompactValue(
  value: string | number,
  options: FormatCompactValueOptions = {}
): string {
  const n = toNumber(value);
  if (!Number.isFinite(n)) return "0";

  const {
    locale = FORMAT_DEFAULT_LOCALE,
    largeThreshold = 1_000_000_000,
    tinyThreshold = 1e-8,
  } = options;
  const abs = Math.abs(n);

  if (abs > 0 && abs < tinyThreshold) {
    return n.toExponential(Math.min(4, Math.max(2, -Math.floor(Math.log10(abs)) + 2)));
  }

  if (abs >= largeThreshold) {
    return new Intl.NumberFormat(locale, {
      notation: "compact",
      compactDisplay: "short",
      maximumFractionDigits: 3,
    }).format(n);
  }

  return formatTokenAmount(n, {
    locale,
    minimumFractionDigits: 0,
    maximumFractionDigits: abs < 1 ? 8 : 6,
  });
}

/** Formats a ratio or percentage fraction (e.g. slippage 0.015 → "1.50%"). */
export function formatPercent(
  fraction: number,
  options: { fractionDigits?: number; locale?: string } = {}
): string {
  if (!Number.isFinite(fraction)) return "—";
  const { fractionDigits = 2, locale = FORMAT_DEFAULT_LOCALE } = options;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(fraction);
}

export type ShortenHashOptions = {
  /** Number of leading characters to keep (default 6). */
  prefixLength?: number;
  /** Number of trailing characters to keep (default 4). */
  suffixLength?: number;
};

/**
 * Shorten a transaction hash or blockchain address for display.
 *
 * Returns `"0xAbCd…7890"` style output. If the value is short enough to
 * display in full it is returned unchanged.
 *
 * @example
 * shortenHash("0x1234567890abcdef1234567890abcdef12345678") // "0x1234…5678"
 * shortenHash("GDRXE2BQUC3AZN…", { prefixLength: 4, suffixLength: 4 })
 */
export function shortenHash(hash: string, options: ShortenHashOptions = {}): string {
  const { prefixLength = 6, suffixLength = 4 } = options;

  if (!hash) return "";

  // If the hash is already short enough, return it as-is.
  const minLength = prefixLength + suffixLength + 3; // 3 = "…".length visually
  if (hash.length <= minLength) return hash;

  return `${hash.slice(0, prefixLength)}…${hash.slice(-suffixLength)}`;
}
