"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function HtlcsRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="HTLCs" error={error} reset={reset} />;
}
