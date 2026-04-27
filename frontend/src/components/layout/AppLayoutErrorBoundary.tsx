"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ErrorBoundary } from "@/components/ErrorBoundary";

interface AppLayoutErrorBoundaryProps {
  children: ReactNode;
}

export function AppLayoutErrorBoundary({ children }: AppLayoutErrorBoundaryProps) {
  const pathname = usePathname();

  return (
    <ErrorBoundary resetKeys={[pathname]} contextName="AppLayout">
      {children}
    </ErrorBoundary>
  );
}
