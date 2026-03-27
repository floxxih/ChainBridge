"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Global Error]", error);
  }, [error]);

  return (
    <div className="container mx-auto flex h-[80vh] flex-col items-center justify-center px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-500/10 text-red-500">
        <AlertCircle className="h-10 w-10" />
      </div>

      <h1 className="text-4xl font-extrabold tracking-tight text-text-primary">
        Bridge Connection Lost
      </h1>

      <p className="mt-4 max-w-md text-text-secondary leading-relaxed">
        An unexpected error occurred while processing your request. Don&apos;t worry, your assets
        remain secure in your wallet.
      </p>

      {error.digest && (
        <code className="mt-6 rounded bg-surface-overlay px-2 py-1 text-xs text-text-muted font-mono">
          ID: {error.digest}
        </code>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <Button onClick={() => reset()} size="lg" icon={<RotateCcw className="h-5 w-5" />}>
          Reset Session
        </Button>
        <Link href="/">
          <Button variant="secondary" size="lg" icon={<Home className="h-5 w-5" />}>
            Back Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
