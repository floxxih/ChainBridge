"use client";

import { getExplorerUrl, isValidChain, ExplorerLinkType } from "@/lib/explorers";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExplorerLinkProps {
  chain: string;
  hash: string;
  type?: ExplorerLinkType;
  label?: string;
  className?: string;
  showIcon?: boolean;
}

export function ExplorerLink({
  chain,
  hash,
  type = "tx",
  label,
  className,
  showIcon = true,
}: ExplorerLinkProps) {
  if (!isValidChain(chain)) {
    return <span className={className}>{label ?? hash}</span>;
  }

  const url = getExplorerUrl(chain, hash, type);
  if (url === "#") {
    return <span className={className}>{label ?? hash}</span>;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-brand-500 hover:text-brand-600",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
        "focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        className
      )}
      aria-label={`View ${type} on explorer: ${label ?? hash}`}
    >
      <span>{label ?? hash}</span>
      {showIcon && <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />}
    </a>
  );
}
