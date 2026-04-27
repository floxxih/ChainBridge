"use client";

import { useMemo } from "react";

import { isFeatureEnabled, type FeatureFlagId, type FeatureFlags } from "@/lib/featureFlags";

/** Stable boolean for conditional rendering of gated UI (prefer over raw env reads). */
export function useFeatureFlag(id: FeatureFlagId, overrides?: Partial<FeatureFlags>): boolean {
  return useMemo(() => isFeatureEnabled(id, overrides), [id, overrides]);
}
