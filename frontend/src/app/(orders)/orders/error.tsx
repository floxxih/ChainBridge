"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function OrdersRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="Orders" error={error} reset={reset} />;
}
