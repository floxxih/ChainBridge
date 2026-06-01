export const PRIMARY_NAV_LINKS = [
  { key: "nav.dashboard", href: "/dashboard" },
  { key: "nav.swap", href: "/swap" },
  { key: "nav.swaps", href: "/swaps" },
  { key: "nav.market", href: "/marketplace" },
  { key: "nav.orders", href: "/orders" },
  { key: "nav.explorer", href: "/transactions" },
] as const;

export const SECONDARY_NAV_LINKS = [
  { key: "nav.htlcs", href: "/htlcs" },
  { key: "nav.protocol", href: "/protocol" },
  { key: "nav.settings", href: "/settings" },
  { key: "nav.about", href: "/about" },
  { key: "nav.admin", href: "/admin" },
] as const;

// Flat list for consumers that don't need grouping (admin filter still applies)
export const NAV_LINKS = [...PRIMARY_NAV_LINKS, ...SECONDARY_NAV_LINKS] as const;
