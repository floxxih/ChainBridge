/**
 * Central, typed feature flags for gradual rollout of experimental UI.
 * Override in unit tests via `isFeatureEnabled(id, overrides)` or `resolveFeatureFlags(partial)`.
 */

export type FeatureFlagMeta = {
  envKey: string;
  defaultValue: boolean;
  description: string;
};

export const FEATURE_FLAG_REGISTRY = {
  ordersEnabled: {
    envKey: "NEXT_PUBLIC_FEATURE_ORDERS_ENABLED",
    defaultValue: true,
    description: "Marketplace orders UI and routes",
  },
  swapsEnabled: {
    envKey: "NEXT_PUBLIC_FEATURE_SWAPS_ENABLED",
    defaultValue: true,
    description: "Cross-chain swap wizard and flows",
  },
  swapWebsocketEnabled: {
    envKey: "NEXT_PUBLIC_FEATURE_SWAP_WS_ENABLED",
    defaultValue: false,
    description: "Live swap status over WebSocket",
  },
  experimentalSwapUi: {
    envKey: "NEXT_PUBLIC_FEATURE_EXPERIMENTAL_SWAP_UI",
    defaultValue: false,
    description: "Experimental swap UI treatments (safe to ship dark)",
  },
  experimentalMarketplaceFilters: {
    envKey: "NEXT_PUBLIC_FEATURE_EXPERIMENTAL_MARKETPLACE_FILTERS",
    defaultValue: false,
    description: "Experimental marketplace filtering and sort UI",
  },
} as const satisfies Record<string, FeatureFlagMeta>;

export type FeatureFlagId = keyof typeof FEATURE_FLAG_REGISTRY;

export type FeatureFlags = Record<FeatureFlagId, boolean>;

function readBoolEnv(env: Record<string, string | undefined>, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

/**
 * Resolves all flags from `process.env` (or a test-supplied env object).
 */
export function resolveFeatureFlags(
  env: Record<string, string | undefined> = typeof process !== "undefined"
    ? (process.env as Record<string, string | undefined>)
    : {}
): FeatureFlags {
  const out = {} as FeatureFlags;
  (Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagId[]).forEach((id) => {
    const meta = FEATURE_FLAG_REGISTRY[id];
    out[id] = readBoolEnv(env, meta.envKey, meta.defaultValue);
  });
  return out;
}

const globalFlags: FeatureFlags = resolveFeatureFlags();

/** Production / SSR module-level flags (from env at build/runtime). */
export const featureFlags: FeatureFlags = globalFlags;

/** Testable flag check; pass `overrides` to simulate rollouts without env. */
export function isFeatureEnabled(id: FeatureFlagId, overrides?: Partial<FeatureFlags>): boolean {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, id)) {
    const v = overrides[id];
    if (typeof v === "boolean") return v;
  }
  return featureFlags[id];
}
