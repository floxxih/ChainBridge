/**
 * Root message catalog shape — nested keys map cleanly to extraction tools (e.g. JSON keys).
 * Add new namespaces here when introducing user-facing copy modules.
 */
export type I18nMessages = {
  nav: {
    dashboard: string;
    swap: string;
    market: string;
    orders: string;
    htlcs: string;
    settings: string;
    protocol: string;
    explorer: string;
    about: string;
    admin: string;
  };
  commandPalette: {
    title: string;
    placeholder: string;
    empty: string;
    routes: string;
    orders: string;
    swaps: string;
    commands: string;
    openButton: string;
  };
  feeBanner: {
    warningTitle: string;
    criticalTitle: string;
    dismiss: string;
    snooze: string;
    guidancePrefix: string;
  };
};
