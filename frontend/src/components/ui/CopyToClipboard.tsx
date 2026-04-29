"use client";

import { useState, useCallback } from "react";
import { copyToClipboard } from "@/lib/clipboard";
import { CopyButton } from "./CopyButton";

interface CopyToClipboardProps {
  value: string;
  label?: string;
  className?: string;
  size?: "sm" | "md";
  onCopySuccess?: () => void;
}

export function CopyToClipboard({
  value,
  label,
  className,
  size = "sm",
  onCopySuccess,
}: CopyToClipboardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const success = await copyToClipboard(value);
    if (success) {
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 2000);
    }
  }, [value, onCopySuccess]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={className}
      aria-label={copied ? "Copied to clipboard" : `Copy ${label ?? "value"} to clipboard`}
    >
      <CopyButton value={value} label={label} size={size} className={className} />
    </button>
  );
}
