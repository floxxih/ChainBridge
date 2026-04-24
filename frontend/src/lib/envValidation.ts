function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export interface ValidatedEnv {
  NEXT_PUBLIC_API_URL: string;
  NEXT_PUBLIC_WS_URL: string;
  NEXT_PUBLIC_STELLAR_NETWORK: "testnet" | "mainnet";
  NEXT_PUBLIC_SOROBAN_RPC_URL: string;
  NEXT_PUBLIC_HORIZON_URL: string;
  NEXT_PUBLIC_BITCOIN_NETWORK: "testnet" | "mainnet";
  NEXT_PUBLIC_ETHEREUM_NETWORK: "testnet" | "mainnet";
  NEXT_PUBLIC_APP_NAME?: string;
  NEXT_PUBLIC_APP_URL?: string;
  NEXT_PUBLIC_ETHEREUM_RPC_URL?: string;
  NEXT_PUBLIC_CHAINBRIDGE_CONTRACT_ID?: string;
  NEXT_PUBLIC_FEATURE_ORDERS_ENABLED?: string;
  NEXT_PUBLIC_FEATURE_SWAPS_ENABLED?: string;
  NEXT_PUBLIC_DEBUG?: string;
}

export class EnvValidationError extends Error {
  public readonly missingVars: string[];
  public readonly invalidVars: Record<string, string>;

  constructor(
    message: string,
    missingVars: string[] = [],
    invalidVars: Record<string, string> = {}
  ) {
    super(message);
    this.name = "EnvValidationError";
    this.missingVars = missingVars;
    this.invalidVars = invalidVars;
  }
}

export function validateEnv(): ValidatedEnv {
  const errors: Record<string, string> = {};
  const missing: string[] = [];

  const required = [
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_WS_URL",
    "NEXT_PUBLIC_STELLAR_NETWORK",
    "NEXT_PUBLIC_SOROBAN_RPC_URL",
    "NEXT_PUBLIC_HORIZON_URL",
    "NEXT_PUBLIC_BITCOIN_NETWORK",
    "NEXT_PUBLIC_ETHEREUM_NETWORK",
  ];

  const urls = [
    "NEXT_PUBLIC_API_URL",
    "NEXT_PUBLIC_WS_URL",
    "NEXT_PUBLIC_SOROBAN_RPC_URL",
    "NEXT_PUBLIC_HORIZON_URL",
  ];

  const enums: Record<string, string[]> = {
    NEXT_PUBLIC_STELLAR_NETWORK: ["testnet", "mainnet"],
    NEXT_PUBLIC_BITCOIN_NETWORK: ["testnet", "mainnet"],
    NEXT_PUBLIC_ETHEREUM_NETWORK: ["testnet", "mainnet"],
  };

  required.forEach((key) => {
    const value = process.env[key];
    if (!value) {
      missing.push(key);
      errors[key] = `${key} is required`;
    }
  });

  urls.forEach((key) => {
    const value = process.env[key];
    if (value && !isValidUrl(value)) {
      errors[key] = `${key} must be a valid URL`;
    }
  });

  Object.entries(enums).forEach(([key, allowedValues]) => {
    const value = process.env[key];
    if (value && !allowedValues.includes(value)) {
      errors[key] = `${key} must be one of: ${allowedValues.join(", ")}`;
    }
  });

  if (Object.keys(errors).length > 0) {
    const message = `Environment configuration is invalid:\n${Object.entries(errors)
      .map(([k, v]) => `  - ${k}: ${v}`)
      .join("\n")}`;
    throw new EnvValidationError(message, missing, errors);
  }

  return {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL!,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL!,
    NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK as "testnet" | "mainnet",
    NEXT_PUBLIC_SOROBAN_RPC_URL: process.env.NEXT_PUBLIC_SOROBAN_RPC_URL!,
    NEXT_PUBLIC_HORIZON_URL: process.env.NEXT_PUBLIC_HORIZON_URL!,
    NEXT_PUBLIC_BITCOIN_NETWORK: process.env.NEXT_PUBLIC_BITCOIN_NETWORK as "testnet" | "mainnet",
    NEXT_PUBLIC_ETHEREUM_NETWORK: process.env.NEXT_PUBLIC_ETHEREUM_NETWORK as "testnet" | "mainnet",
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    NEXT_PUBLIC_ETHEREUM_RPC_URL: process.env.NEXT_PUBLIC_ETHEREUM_RPC_URL,
    NEXT_PUBLIC_CHAINBRIDGE_CONTRACT_ID: process.env.NEXT_PUBLIC_CHAINBRIDGE_CONTRACT_ID,
    NEXT_PUBLIC_FEATURE_ORDERS_ENABLED: process.env.NEXT_PUBLIC_FEATURE_ORDERS_ENABLED,
    NEXT_PUBLIC_FEATURE_SWAPS_ENABLED: process.env.NEXT_PUBLIC_FEATURE_SWAPS_ENABLED,
    NEXT_PUBLIC_DEBUG: process.env.NEXT_PUBLIC_DEBUG,
  };
}
