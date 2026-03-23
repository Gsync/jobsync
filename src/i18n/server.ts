import "server-only";

/**
 * Server-only i18n API — use in Server Components and Server Actions.
 *
 * Usage:
 *   import { t, getUserLocale } from "@/i18n/server";
 *   const locale = await getUserLocale();
 *   const label = t(locale, "nav.dashboard");
 */

// ─── Translation (Server) ──────────────────────────────────────────
export { t, getDictionary } from "./dictionaries";
export type { TranslationKey } from "./dictionaries";

// ─── Locale (Server-only: reads from DB/cookies) ───────────────────
export { getUserLocale, getLocaleFromCookie } from "@/lib/locale";

// ─── Formatting (also available, re-exported for convenience) ──────
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
} from "@/lib/formatters";
