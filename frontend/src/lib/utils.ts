import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { formatTokenAmount } from "@/lib/format";

/** Merge class names with Tailwind conflict resolution */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Truncate a blockchain address to show first/last N chars */
export function truncateAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Format a token amount with decimals — delegates to shared {@link formatTokenAmount}. */
export function formatAmount(amount: string | number, decimals = 7): string {
  return formatTokenAmount(amount, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}

/** Format a date to a relative time string */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

/** Format a date to absolute UTC timestamp */
export function formatAbsoluteUTC(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  
  return d.toISOString().replace("T", " ").substring(0, 19) + " UTC";
}

/** Format a date to absolute local timestamp */
export function formatAbsoluteLocal(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

/** Format a date with explicit UTC/local behavior */
export function formatTimestamp(
  date: string | Date,
  options: {
    mode?: "relative" | "absolute";
    timezone?: "utc" | "local";
  } = {}
): string {
  const { mode = "relative", timezone = "local" } = options;
  
  const d = typeof date === "string" ? new Date(date) : date;
  
  // Handle invalid dates
  if (isNaN(d.getTime())) {
    return "Invalid date";
  }
  
  if (mode === "relative") {
    return formatRelativeTime(d);
  }
  
  return timezone === "utc" ? formatAbsoluteUTC(d) : formatAbsoluteLocal(d);
}

/** Map chain name to its display color / class */
export const CHAIN_COLORS: Record<string, string> = {
  stellar: "text-chain-stellar",
  bitcoin: "text-chain-bitcoin",
  ethereum: "text-chain-ethereum",
  solana: "text-chain-solana",
};

export const CHAIN_BG: Record<string, string> = {
  stellar: "bg-chain-stellar/10 text-chain-stellar border-chain-stellar/20",
  bitcoin: "bg-chain-bitcoin/10 text-chain-bitcoin border-chain-bitcoin/20",
  ethereum: "bg-chain-ethereum/10 text-chain-ethereum border-chain-ethereum/20",
  solana: "bg-chain-solana/10 text-chain-solana border-chain-solana/20",
};
