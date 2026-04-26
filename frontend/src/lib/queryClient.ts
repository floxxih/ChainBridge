import { QueryClient } from "@tanstack/react-query";

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const status = (error as { response?: { status?: number }; code?: string }).response?.status;
  if (status === undefined) return true;
  return status >= 500;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount > 3) return false;
        return isRetryableError(error);
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
    mutations: {
      retry: (failureCount, error) => {
        if (failureCount > 2) return false;
        return isRetryableError(error);
      },
      retryDelay: (attemptIndex: number) => Math.min(1000 * Math.pow(2, attemptIndex), 30000),
    },
  },
});

/** Standardized query keys by domain */
export const queryKeys = {
  swaps: {
    all: ["swaps"] as const,
    list: (filters?: Record<string, unknown>) => ["swaps", "list", filters] as const,
    detail: (id: string) => ["swaps", "detail", id] as const,
  },
  transactions: {
    all: ["transactions"] as const,
    list: (filters?: Record<string, unknown>) => ["transactions", "list", filters] as const,
    detail: (id: string) => ["transactions", "detail", id] as const,
  },
  orders: {
    all: ["orders"] as const,
    list: (pair?: string) => ["orders", "list", pair] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
    book: (pair: string) => ["orders", "book", pair] as const,
  },
  htlcs: {
    all: ["htlcs"] as const,
    list: (filters?: Record<string, unknown>) => ["htlcs", "list", filters] as const,
    detail: (id: string) => ["htlcs", "detail", id] as const,
  },
  dashboard: {
    health: ["dashboard", "health"] as const,
    stats: ["dashboard", "stats"] as const,
  },
  wallet: {
    balance: (chain: string, address: string) => ["wallet", "balance", chain, address] as const,
  },
} as const;
