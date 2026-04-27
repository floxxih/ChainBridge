/** Supported BCP-like locale codes aligned with message catalog files. */
export const SUPPORTED_LOCALES = ["en", "es", "zh", "ja", "ar"] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

/** Default locale — single source of truth for fallback copy. */
export const DEFAULT_LOCALE: SupportedLocale = "en";
