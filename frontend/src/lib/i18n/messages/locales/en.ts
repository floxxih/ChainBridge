import type { I18nMessages } from "../types";

/** Default (English) catalog — keys mirror `I18nMessages` for extraction tooling. */
export const messagesEn: I18nMessages = {
  nav: {
    dashboard: "Dashboard",
    swap: "Swap",
    market: "Market",
    orders: "Orders",
    htlcs: "HTLCs",
    settings: "Settings",
    protocol: "Protocol",
    explorer: "Explorer",
    about: "About",
    admin: "Admin",
  },
  commandPalette: {
    title: "Quick Actions",
    placeholder: "Search routes, orders, swaps, commands...",
    empty: "No matching actions",
    routes: "Routes",
    orders: "Orders",
    swaps: "Swaps",
    commands: "Commands",
    openButton: "Open command palette",
  },
  feeBanner: {
    warningTitle: "Elevated network fees detected",
    criticalTitle: "High congestion risk",
    dismiss: "Dismiss",
    snooze: "Snooze 30m",
    guidancePrefix: "Guidance",
  },
};
