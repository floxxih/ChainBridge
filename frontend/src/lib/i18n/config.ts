/**
 * Public i18n API: locale detection, localized paths, and typed message catalog access.
 */

import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "./constants";
import { MESSAGE_CATALOG } from "./messages";
import type { I18nMessages } from "./messages/types";

export {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "./constants";

export type { I18nMessages } from "./messages/types";

export { interpolateCount, selectPlural, type PluralForms } from "./pluralize";

export const RTL_LOCALES: SupportedLocale[] = ["ar"];

export function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

export function getMessages(locale?: string): I18nMessages {
  if (locale && isSupportedLocale(locale)) {
    return MESSAGE_CATALOG[locale];
  }
  return MESSAGE_CATALOG[DEFAULT_LOCALE];
}

export function getLocaleFromPathname(pathname: string): SupportedLocale {
  const segment = pathname.split("/").filter(Boolean)[0];
  if (segment && isSupportedLocale(segment)) {
    return segment;
  }
  return DEFAULT_LOCALE;
}

export function stripLocaleFromPathname(pathname: string): string {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const segment = normalized.split("/").filter(Boolean)[0];
  if (segment && isSupportedLocale(segment)) {
    const stripped = normalized.replace(new RegExp(`^/${segment}`), "");
    return stripped.length > 0 ? stripped : "/";
  }
  return normalized;
}

export function buildLocalizedPath(pathname: string, locale: SupportedLocale): string {
  const normalized = stripLocaleFromPathname(pathname.startsWith("/") ? pathname : `/${pathname}`);
  if (normalized === "/") {
    return `/${locale}`;
  }
  return `/${locale}${normalized}`;
}
