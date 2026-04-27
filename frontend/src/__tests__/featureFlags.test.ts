import {
  FEATURE_FLAG_REGISTRY,
  isFeatureEnabled,
  resolveFeatureFlags,
  type FeatureFlagId,
  type FeatureFlags,
} from "@/lib/featureFlags";

describe("resolveFeatureFlags", () => {
  it("uses env when set", () => {
    const env: Record<string, string> = {
      NEXT_PUBLIC_FEATURE_ORDERS_ENABLED: "false",
      NEXT_PUBLIC_FEATURE_SWAPS_ENABLED: "true",
      NEXT_PUBLIC_FEATURE_SWAP_WS_ENABLED: "0",
      NEXT_PUBLIC_FEATURE_EXPERIMENTAL_SWAP_UI: "true",
      NEXT_PUBLIC_FEATURE_EXPERIMENTAL_MARKETPLACE_FILTERS: "false",
    };
    const flags = resolveFeatureFlags(env);
    expect(flags.ordersEnabled).toBe(false);
    expect(flags.swapsEnabled).toBe(true);
    expect(flags.swapWebsocketEnabled).toBe(false);
    expect(flags.experimentalSwapUi).toBe(true);
    expect(flags.experimentalMarketplaceFilters).toBe(false);
  });

  it("falls back to registry defaults for missing keys", () => {
    const flags = resolveFeatureFlags({});
    expect(flags.ordersEnabled).toBe(FEATURE_FLAG_REGISTRY.ordersEnabled.defaultValue);
    expect(flags.experimentalSwapUi).toBe(FEATURE_FLAG_REGISTRY.experimentalSwapUi.defaultValue);
  });
});

describe("isFeatureEnabled", () => {
  it("returns override when provided", () => {
    const overrides: Partial<FeatureFlags> = { experimentalSwapUi: true };
    expect(isFeatureEnabled("experimentalSwapUi", overrides)).toBe(true);
    expect(isFeatureEnabled("experimentalSwapUi", { experimentalSwapUi: false })).toBe(false);
  });
});

describe("FEATURE_FLAG_REGISTRY", () => {
  it("covers every FeatureFlagId with an envKey and default", () => {
    const ids = Object.keys(FEATURE_FLAG_REGISTRY) as FeatureFlagId[];
    ids.forEach((id) => {
      const meta = FEATURE_FLAG_REGISTRY[id];
      expect(meta.envKey).toMatch(/^NEXT_PUBLIC_FEATURE_/);
      expect(typeof meta.defaultValue).toBe("boolean");
      expect(meta.description.length).toBeGreaterThan(0);
    });
  });
});
