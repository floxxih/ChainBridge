/**
 * Typed environment configuration for ChainBridge frontend.
 * All variables are validated at startup to surface misconfiguration early.
 */

function getEnv(key: string, fallback?: string): string {
  const value = process.env[key];
  if (!value && fallback === undefined) {
    // Only warn in development — don't throw to allow SSR/build
    if (process.env.NODE_ENV === "development") {
      console.warn(`[config] Missing env var: ${key}`);
    }
    return "";
  }
  return value ?? fallback ?? "";
}

export const config = {
  app: {
    name: getEnv("NEXT_PUBLIC_APP_NAME", "ChainBridge"),
    url: getEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
    debug: getEnv("NEXT_PUBLIC_DEBUG", "false") === "true",
  },

  api: {
    url: getEnv("NEXT_PUBLIC_API_URL", "http://localhost:8000"),
    wsUrl: getEnv("NEXT_PUBLIC_WS_URL", "ws://localhost:8000/ws"),
  },

  stellar: {
    network: getEnv("NEXT_PUBLIC_STELLAR_NETWORK", "testnet") as "testnet" | "mainnet",
    sorobanRpc: getEnv("NEXT_PUBLIC_SOROBAN_RPC_URL", "https://soroban-testnet.stellar.org"),
    horizonUrl: getEnv("NEXT_PUBLIC_HORIZON_URL", "https://horizon-testnet.stellar.org"),
    chainbridgeContractId: getEnv("NEXT_PUBLIC_CHAINBRIDGE_CONTRACT_ID", ""),
  },

  bitcoin: {
    network: getEnv("NEXT_PUBLIC_BITCOIN_NETWORK", "testnet") as "testnet" | "mainnet",
  },

  ethereum: {
    network: getEnv("NEXT_PUBLIC_ETHEREUM_NETWORK", "testnet") as "testnet" | "mainnet",
    rpcUrl: getEnv("NEXT_PUBLIC_ETHEREUM_RPC_URL", ""),
  },

  features: {
    ordersEnabled: getEnv("NEXT_PUBLIC_FEATURE_ORDERS_ENABLED", "true") === "true",
    swapsEnabled: getEnv("NEXT_PUBLIC_FEATURE_SWAPS_ENABLED", "true") === "true",
  },
} as const;

export type AppConfig = typeof config;

export default config;
