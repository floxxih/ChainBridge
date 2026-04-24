"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function MarketplaceRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="Marketplace" error={error} reset={reset} />;
}
