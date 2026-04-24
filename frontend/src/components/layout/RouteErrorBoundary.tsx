"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui";

interface RouteErrorBoundaryProps {
  routeName: string;
  error: Error & { digest?: string };
  reset: () => void;
}

export function RouteErrorBoundary({ routeName, error, reset }: RouteErrorBoundaryProps) {
  useEffect(() => {
    console.error(`[Route Error:${routeName}]`, {
      name: error.name,
      message: error.message,
      digest: error.digest,
    });
  }, [error, routeName]);

  return (
    <div className="container mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 text-red-400">
        <AlertCircle className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary">{routeName} temporarily unavailable</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Something went wrong while rendering this route. Retry now or go back home.
      </p>
      {error.digest && (
        <p className="mt-3 text-xs text-text-muted font-mono">error-id: {error.digest}</p>
      )}
      <div className="mt-6 flex items-center justify-center gap-3">
        <Button onClick={() => reset()} icon={<RotateCcw className="h-4 w-4" />}>
          Retry
        </Button>
        <Link href="/">
          <Button variant="secondary">Go Home</Button>
        </Link>
      </div>
    </div>
  );
}
