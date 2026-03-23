/**
 * Public i18n API (client-safe) — the single import point for client components.
 *
 * For server components/actions, also import from "@/i18n/server".
 *
 * Usage in Client Components:
 *   import { useTranslations, formatDate, formatNumber } from "@/i18n";
 *
 * Usage in Server Components:
 *   import { useTranslations } from "@/i18n";
 *   import { t, getUserLocale } from "@/i18n/server";
 */

// ─── Translation (Client) ──────────────────────────────────────────
export { useTranslations } from "./use-translations";

// ─── Locale Utilities (client-safe, no server-only) ────────────────
export {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  LOCALE_MAP,
  isValidLocale,
} from "./locales";
export type { SupportedLocale } from "./locales";

// ─── Dictionary (client-safe) ──────────────────────────────────────
export { getDictionary } from "./dictionaries";
export type { TranslationKey, Dictionary } from "./dictionaries";

// ─── Formatting (Intl + date-fns, client-safe) ─────────────────────
export {
  formatDate,
  formatDateShort,
  formatDateLong,
  formatDateTime,
  formatDateTimeSeconds,
  formatDateCompact,
  formatMonthYear,
  formatTime,
  formatTimeSeconds,
  formatISODate,
  formatWeekdayDate,
  formatNumber,
  formatPercent,
  formatDecimal,
  formatCurrency,
  formatRelativeTime,
  setFormatOverrides,
} from "@/lib/formatters";
