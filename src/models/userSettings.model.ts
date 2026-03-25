import { AiProvider } from "./ai.model";

export interface AiSettings {
  provider: AiProvider;
  model: string | undefined;
}

/** User-overridable format preferences. When undefined, Intl defaults for the locale are used. */
export interface FormatSettings {
  /** Override date style: "short" (3/23/26), "medium" (Mar 23, 2026), "long" (March 23, 2026) */
  dateStyle?: "short" | "medium" | "long";
  /** Override time format: "12h" or "24h". Default: locale-specific (e.g., 24h for DE, 12h for EN) */
  timeFormat?: "12h" | "24h";
  /** First day of week: 0=Sunday (US), 1=Monday (EU). Default: locale-specific */
  firstDayOfWeek?: 0 | 1;
}

export interface DisplaySettings {
  theme: "light" | "dark" | "system";
  locale: string;
  /** Optional format overrides — when absent, Intl locale defaults are used (CLDR) */
  format?: FormatSettings;
}

export interface DeveloperSettings {
  debugLogging: boolean;
  logCategories: {
    scheduler: boolean;
    runner: boolean;
    automationLogger: boolean;
  };
  /** Comma-separated list of allowed dev origins (e.g., "http://192.168.1.100:3737") */
  allowedDevOrigins?: string;
}

export interface UserSettingsData {
  ai: AiSettings;
  display: DisplaySettings;
  developer?: DeveloperSettings;
}

export interface UserSettings {
  userId: string;
  settings: UserSettingsData;
}

export const defaultUserSettings: UserSettingsData = {
  ai: {
    provider: AiProvider.OLLAMA,
    model: undefined,
  },
  display: {
    theme: "system",
    locale: "en",
  },
  developer: {
    debugLogging: true,
    logCategories: {
      scheduler: true,
      runner: true,
      automationLogger: true,
    },
  },
};
