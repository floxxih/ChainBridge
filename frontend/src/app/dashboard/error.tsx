"use client";

import { RouteErrorBoundary } from "@/components/layout/RouteErrorBoundary";

export default function DashboardRouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <RouteErrorBoundary routeName="Dashboard" error={error} reset={reset} />;
}
