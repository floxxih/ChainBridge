"use client";

import { getTokenIcon } from "@/lib/iconRegistry";
import { cn } from "@/lib/utils";

interface TokenIconProps {
  token: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function TokenIcon({ token, size = "md", className }: TokenIconProps) {
  const Icon = getTokenIcon(token);

  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  }[size];

  return <Icon className={cn(sizeClass, className)} aria-label={`${token} token icon`} />;
}
