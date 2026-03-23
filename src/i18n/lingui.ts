import { i18n, type Messages } from "@lingui/core";
import { cache } from "react";
import { DEFAULT_LOCALE } from "./locales";

// Dynamically load message catalogs
async function loadCatalog(locale: string): Promise<Messages> {
  const { messages } = await import(`./messages/${locale}.ts`);
  return messages;
}

/**
 * Server-side: get or create a cached i18n instance for the current request.
 * Uses React `cache()` so each request gets its own instance.
 */
export const getI18nInstance = cache(async (locale: string) => {
  const messages = await loadCatalog(locale);
  i18n.loadAndActivate({ locale, messages });
  return i18n;
});

/**
 * Initialize i18n for a given locale. Call this in the root layout.
 */
export async function initI18n(locale: string = DEFAULT_LOCALE) {
  return getI18nInstance(locale);
}
