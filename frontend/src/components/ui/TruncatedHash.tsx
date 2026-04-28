"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { shortenHash, type ShortenHashOptions } from "@/lib/format";
import { Copy, Check } from "lucide-react";

interface TruncatedHashProps {
  /** The full transaction hash or address. */
  hash: string;
  /** How to shorten the display value. */
  shortenOptions?: ShortenHashOptions;
  /** Show an inline copy button. @default true */
  copiable?: boolean;
  /** Additional class names for the root element. */
  className?: string;
  /** Label used for the copy aria-label. @default "hash" */
  label?: string;
}

/**
 * Displays a shortened hash/address with:
 * - full value visible on hover/focus via the `title` attribute
 * - an optional inline copy button that copies the **full** hash
 * - consistent shortening across the app via `shortenHash`
 */
export function TruncatedHash({
  hash,
  shortenOptions,
  copiable = true,
  className,
  label = "hash",
}: TruncatedHashProps) {
  const [copied, setCopied] = useState(false);

  const short = shortenHash(hash, shortenOptions);

  const handleCopy = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(hash);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement("textarea");
        textarea.value = hash;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    },
    [hash]
  );

  return (
    <span
      className={cn("inline-flex items-center gap-1 font-mono text-xs", className)}
      title={hash}
    >
      <span
        className="cursor-default tabular-nums"
        aria-label={`Shortened ${label}: ${short}. Full value: ${hash}`}
        tabIndex={0}
      >
        {short}
      </span>
      {copiable && (
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            "inline-flex shrink-0 items-center rounded p-0.5 transition-colors",
            "text-text-muted hover:text-text-primary hover:bg-surface-overlay",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
          )}
          aria-label={copied ? "Copied to clipboard" : `Copy full ${label} to clipboard`}
        >
          {copied ? (
            <Check className="h-3 w-3 text-emerald-400" aria-hidden="true" />
          ) : (
            <Copy className="h-3 w-3" aria-hidden="true" />
          )}
        </button>
      )}
    </span>
  );
}
