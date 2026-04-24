"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function SwapRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="Swap" error={error} reset={reset} />;
}
