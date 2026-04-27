/**
 * Message catalog entry — locale bundles are composed here for extraction and typing.
 */

import type { SupportedLocale } from "../constants";

import { messagesAr } from "./locales/ar";
import { messagesEn } from "./locales/en";
import { messagesEs } from "./locales/es";
import { messagesJa } from "./locales/ja";
import { messagesZh } from "./locales/zh";
import type { I18nMessages } from "./types";

export type { I18nMessages } from "./types";

export const MESSAGE_CATALOG: Record<SupportedLocale, I18nMessages> = {
  en: messagesEn,
  es: messagesEs,
  zh: messagesZh,
  ja: messagesJa,
  ar: messagesAr,
};

export function getCatalogMessages(locale: SupportedLocale): I18nMessages {
  return MESSAGE_CATALOG[locale];
}
