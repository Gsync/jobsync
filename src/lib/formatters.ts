/**
 * Locale-aware formatters for dates, numbers, and currencies.
 * All functions accept a locale string and use Intl APIs internally.
 *
 * Usage in Client Components:
 *   const { locale } = useTranslations();
 *   formatDate(date, locale)
 *
 * Usage in Server Components:
 *   const locale = await getUserLocale();
 *   formatDate(date, locale)
 */

import { format as dateFnsFormat, type Locale } from "date-fns";
import { de, fr, es, enUS } from "date-fns/locale";
import type { FormatSettings } from "@/models/userSettings.model";

const DATE_FNS_LOCALES: Record<string, Locale> = {
  en: enUS,
  de: de,
  fr: fr,
  es: es,
};

function getDateFnsLocale(locale: string): Locale {
  return DATE_FNS_LOCALES[locale] ?? enUS;
}

/**
 * Optional user format overrides. Set via setFormatOverrides() from user settings.
 * When absent, Intl/CLDR locale defaults are used.
 */
let formatOverrides: FormatSettings | undefined;

/** Call once in layout/provider to set user format preferences. */
export function setFormatOverrides(overrides?: FormatSettings) {
  formatOverrides = overrides;
}

function getDateStyle(): "short" | "medium" | "long" {
  return formatOverrides?.dateStyle ?? "medium";
}

function is24Hour(locale: string): boolean {
  if (formatOverrides?.timeFormat) {
    return formatOverrides.timeFormat === "24h";
  }
  // CLDR default: most EU locales use 24h, en/el use 12h
  const hour12Locales = ["en", "el", "mt"];
  return !hour12Locales.includes(locale);
}

// ─── Date Formatting ───────────────────────────────────────────────

/** Format a date using date-fns with locale support. */
export function formatDate(
  date: Date | string | number,
  locale: string,
  pattern: string = "PP",
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return dateFnsFormat(d, pattern, { locale: getDateFnsLocale(locale) });
}

/** Short date: "Mar 23, 2026" (en) / "23. März 2026" (de) / "23 mars 2026" (fr) */
export function formatDateShort(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "PP");
}

/** Long date: "Monday, March 23, 2026" (en) / "Montag, 23. März 2026" (de) */
export function formatDateLong(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "PPPP");
}

/** Date with time: "Mar 23, 2:30 PM" (en) / "23. März, 14:30" (de) */
export function formatDateTime(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "PPp");
}

/** Date with seconds: "Mar 23, 2:30:15 PM" (en) / "23. März, 14:30:15" (de) */
export function formatDateTimeSeconds(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "PPpp");
}

/** Month and year only: "Mar 2026" (en) / "März 2026" (de) */
export function formatMonthYear(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "MMM yyyy");
}

/** Short date for compact displays: "Mar 23, 2:30 PM" (en) */
export function formatDateCompact(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "MMM d, p");
}

/** Time only: "2:30 PM" (en) / "14:30" (de). Respects user 12h/24h preference. */
export function formatTime(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: !is24Hour(locale),
  }).format(d);
}

/** Time with seconds. Respects user 12h/24h preference. */
export function formatTimeSeconds(date: Date | string | number, locale: string): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: !is24Hour(locale),
  }).format(d);
}

/** ISO date for data attributes and filenames: "2026-03-23" (locale-independent) */
export function formatISODate(date: Date | string | number): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  return dateFnsFormat(d, "yyyy-MM-dd");
}

/** Weekday + date: "Mon, Mar 23, 2026" (en) / "Mo., 23. März 2026" (de) */
export function formatWeekdayDate(date: Date | string | number, locale: string): string {
  return formatDate(date, locale, "EEE, PP");
}

// ─── Number Formatting ─────────────────────────────────────────────

/** Format a number with locale-aware thousand separators. */
export function formatNumber(
  value: number,
  locale: string,
  options?: Intl.NumberFormatOptions,
): string {
  return new Intl.NumberFormat(locale, options).format(value);
}

/** Format a percentage: "80 %" (de/fr) / "80%" (en) */
export function formatPercent(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(value / 100);
}

/** Format a decimal number: "1,234.5" (en) / "1.234,5" (de) */
export function formatDecimal(
  value: number,
  locale: string,
  decimals: number = 1,
): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// ─── Currency Formatting ───────────────────────────────────────────

/** Format currency: "$1,000" (en) / "1.000 €" (de) / "1 000 €" (fr) */
export function formatCurrency(
  value: number,
  locale: string,
  currency: string = "EUR",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

// ─── Relative Time ─────────────────────────────────────────────────

/** Format relative time: "2 hours ago" (en) / "vor 2 Stunden" (de) */
export function formatRelativeTime(
  date: Date | string | number,
  locale: string,
): string {
  const d = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (diffDays > 0) return rtf.format(-diffDays, "day");
  if (diffHours > 0) return rtf.format(-diffHours, "hour");
  if (diffMins > 0) return rtf.format(-diffMins, "minute");
  return rtf.format(-diffSecs, "second");
}
