"use client";

import { useCallback } from "react";
import { getDictionary, type TranslationKey } from "./dictionaries";

/**
 * Hook for client components to access translations.
 * Reads the locale from the html lang attribute (set by root layout).
 */
export function useTranslations(localeOverride?: string) {
  const locale =
    localeOverride ??
    (typeof document !== "undefined"
      ? document.documentElement.lang || "en"
      : "en");
  const dict = getDictionary(locale);

  const t = useCallback(
    (key: TranslationKey) => dict[key] ?? key,
    [dict],
  );

  return { t, locale };
}
