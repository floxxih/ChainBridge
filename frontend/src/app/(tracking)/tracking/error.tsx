"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function TrackingRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="Tracking" error={error} reset={reset} />;
}
