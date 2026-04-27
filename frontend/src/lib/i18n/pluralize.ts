/**
 * Pluralization utilities for catalog-driven UI.
 *
 * Extraction roadmap: prefer storing ICU MessageFormat templates in message files, e.g.
 * `{count, plural, one {# pending order} other {# pending orders}}`, and resolve with a
 * library such as `@formatjs/intl` when you add a runtime locale switcher beyond `getMessages`.
 *
 * Today we expose `Intl.PluralRules`-backed selection for Latin and CJK locales; Arabic and
 * other RTL languages use CLDR plural categories via the same API. Extend with explicit
 * `zero` / `two` forms when translating into languages that require them.
 */

import type { SupportedLocale } from "./constants";

export type PluralForms = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

/**
 * Picks the correct plural string for `count` in `locale`.
 * Supply only `one` and `other` for English-like locales; add `zero` where "0 items" differs.
 */
export function selectPlural(locale: SupportedLocale, count: number, forms: PluralForms): string {
  const n = Math.abs(Math.trunc(count));
  const rules = new Intl.PluralRules(locale);
  const category = rules.select(n);

  switch (category) {
    case "zero":
      return forms.zero ?? forms.other;
    case "one":
      return forms.one;
    case "two":
      return forms.two ?? forms.other;
    case "few":
      return forms.few ?? forms.other;
    case "many":
      return forms.many ?? forms.other;
    default:
      return forms.other;
  }
}

/**
 * English helper for simple catalog lines: interpolates `count` into templates using `{count}`.
 */
export function interpolateCount(template: string, count: number): string {
  return template.replace(/\{count\}/g, String(count));
}
