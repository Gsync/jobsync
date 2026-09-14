import { AiProvider } from "./ai.model";

export interface AiSettings {
  provider: AiProvider;
  model: string | undefined;
}

export type ClockFormat = "12h" | "24h";

export interface DisplaySettings {
  theme: "light" | "dark" | "system";
  clockFormat?: ClockFormat;
}

export interface UserSettingsData {
  ai: AiSettings;
  display: DisplaySettings;
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
    clockFormat: "12h",
  },
};

