import type { Route } from "next";

export type PrefetchConfig = {
  href: string;
  priority: "high" | "medium" | "low";
  condition?: (pathname: string) => boolean;
};

export const PREFETCH_ROUTES: PrefetchConfig[] = [
  { href: "/swap", priority: "high" },
  { href: "/dashboard", priority: "high" },
  { href: "/marketplace", priority: "medium" },
  { href: "/orders", priority: "medium" },
  { href: "/transactions", priority: "medium" },
  { href: "/htlcs", priority: "low" },
  { href: "/settings", priority: "low" },
  { href: "/protocol", priority: "low" },
  { href: "/about", priority: "low" },
];

export const SWAP_FLOW_PREFETCH: PrefetchConfig[] = [
  { href: "/swap", priority: "high", condition: (p) => p === "/" || p === "/dashboard" },
  { href: "/orders", priority: "high", condition: (p) => p === "/swap" },
  { href: "/transactions", priority: "medium", condition: (p) => p === "/swap" || p === "/orders" },
  { href: "/htlcs", priority: "medium", condition: (p) => p === "/swap" },
];

export function getPrefetchRoutesForPath(pathname: string): PrefetchConfig[] {
  return SWAP_FLOW_PREFETCH.filter((config) => {
    if (!config.condition) return false;
    return config.condition(pathname);
  });
}

export function shouldPrefetch(href: string, currentPathname: string): boolean {
  const normalizedHref = href.split("?")[0];

  if (normalizedHref === currentPathname) {
    return false;
  }

  const swapFlowRoutes = ["/swap", "/orders", "/transactions", "/htlcs"];
  if (swapFlowRoutes.includes(normalizedHref)) {
    return true;
  }

  return false;
}
