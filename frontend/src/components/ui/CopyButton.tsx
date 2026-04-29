"use client";

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
}

export function CopyButton({ value, label, className, size = "sm" }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value]);

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const padding = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg text-text-muted transition-colors",
        "hover:text-text-primary hover:bg-surface-overlay",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        padding,
        className
      )}
      aria-label={copied ? "Copied to clipboard" : `Copy ${label ?? "value"} to clipboard`}
    >
      {copied ? (
        <Check className={cn(iconSize, "text-emerald-400")} aria-hidden="true" />
      ) : (
        <Copy className={iconSize} aria-hidden="true" />
      )}
      {label && <span className="text-xs">{copied ? "Copied!" : label}</span>}
    </button>
  );
}
