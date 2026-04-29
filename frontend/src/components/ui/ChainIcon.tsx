"use client";

import { getChainIcon } from "@/lib/iconRegistry";
import { cn } from "@/lib/utils";

interface ChainIconProps {
  chain: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ChainIcon({ chain, size = "md", className }: ChainIconProps) {
  const Icon = getChainIcon(chain);

  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  return <Icon className={cn(sizeClass, className)} aria-label={`${chain} chain icon`} />;
}
