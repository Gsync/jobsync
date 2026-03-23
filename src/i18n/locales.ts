export interface SupportedLocale {
  code: string;
  name: string;
  nativeName: string;
  flag: string; // ISO country code for flag icon (lowercase)
}

export const SUPPORTED_LOCALES: SupportedLocale[] = [
  { code: "en", name: "English", nativeName: "English", flag: "gb" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "de" },
  { code: "fr", name: "French", nativeName: "Français", flag: "fr" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "es" },
];

export const DEFAULT_LOCALE = "en";

export const LOCALE_MAP = new Map(
  SUPPORTED_LOCALES.map((l) => [l.code, l]),
);

export function isValidLocale(code: string): boolean {
  return LOCALE_MAP.has(code);
}
