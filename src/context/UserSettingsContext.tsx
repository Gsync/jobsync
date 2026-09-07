"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  ClockFormat,
  defaultUserSettings,
  DisplaySettings,
  UserSettingsData,
} from "@/models/userSettings.model";
import {
  getUserSettings,
  updateDisplaySettings,
} from "@/actions/userSettings.actions";
import { formatDateTime, formatTime } from "@/lib/utils";

interface UserSettingsContextType {
  settings: UserSettingsData;
  clockFormat: ClockFormat;
  setClockFormat: (clockFormat: ClockFormat) => Promise<boolean>;
  updateDisplay: (display: Partial<DisplaySettings>) => Promise<boolean>;
  refreshSettings: () => Promise<void>;
  formatTime: (date: Date | string | number) => string;
  formatDateTime: (date: Date | string | number) => string;
}

const UserSettingsContext = createContext<UserSettingsContextType | undefined>(
  undefined
);

interface UserSettingsProviderProps {
  children: React.ReactNode;
  initialSettings?: UserSettingsData;
}

export function UserSettingsProvider({
  children,
  initialSettings,
}: UserSettingsProviderProps) {
  const [settings, setSettings] = useState<UserSettingsData>(() => ({
    ...defaultUserSettings,
    ...initialSettings,
    display: {
      ...defaultUserSettings.display,
      ...initialSettings?.display,
    },
    ai: {
      ...defaultUserSettings.ai,
      ...initialSettings?.ai,
    },
  }));

  const refreshSettings = useCallback(async () => {
    try {
      const res = await getUserSettings();
      if (res?.success && res.data?.settings) {
        setSettings({
          ...defaultUserSettings,
          ...res.data.settings,
          display: {
            ...defaultUserSettings.display,
            ...res.data.settings.display,
          },
          ai: {
            ...defaultUserSettings.ai,
            ...res.data.settings.ai,
          },
        });
      }
    } catch (err) {
      console.error("Failed to load user settings:", err);
    }
  }, []);

  useEffect(() => {
    if (!initialSettings) {
      refreshSettings();
    }
  }, [initialSettings, refreshSettings]);

  const clockFormat: ClockFormat = settings.display?.clockFormat || "12h";

  const updateDisplay = useCallback(
    async (display: Partial<DisplaySettings>): Promise<boolean> => {
      const mergedDisplay = {
        ...settings.display,
        ...display,
      };
      setSettings((prev) => ({
        ...prev,
        display: mergedDisplay,
      }));

      try {
        const res = await updateDisplaySettings(mergedDisplay);
        if (!res?.success) {
          await refreshSettings();
          return false;
        }
        return true;
      } catch (err) {
        console.error("Failed to update display settings:", err);
        await refreshSettings();
        return false;
      }
    },
    [settings.display, refreshSettings]
  );

  const setClockFormat = useCallback(
    async (newFormat: ClockFormat): Promise<boolean> => {
      return updateDisplay({ clockFormat: newFormat });
    },
    [updateDisplay]
  );

  const formatTimeHelper = useCallback(
    (date: Date | string | number) => {
      return formatTime(date, clockFormat);
    },
    [clockFormat]
  );

  const formatDateTimeHelper = useCallback(
    (date: Date | string | number) => {
      return formatDateTime(date, clockFormat);
    },
    [clockFormat]
  );

  const contextValue = useMemo(
    () => ({
      settings,
      clockFormat,
      setClockFormat,
      updateDisplay,
      refreshSettings,
      formatTime: formatTimeHelper,
      formatDateTime: formatDateTimeHelper,
    }),
    [
      settings,
      clockFormat,
      setClockFormat,
      updateDisplay,
      refreshSettings,
      formatTimeHelper,
      formatDateTimeHelper,
    ]
  );

  return (
    <UserSettingsContext.Provider value={contextValue}>
      {children}
    </UserSettingsContext.Provider>
  );
}

export function useUserSettings(): UserSettingsContextType {
  const context = useContext(UserSettingsContext);
  if (!context) {
    // Fallback for tests or out-of-provider components
    return {
      settings: defaultUserSettings,
      clockFormat: "12h",
      setClockFormat: async () => false,
      updateDisplay: async () => false,
      refreshSettings: async () => {},
      formatTime: (date) => formatTime(date, "12h"),
      formatDateTime: (date) => formatDateTime(date, "12h"),
    };
  }
  return context;
}

export function useClockFormat(): ClockFormat {
  const { clockFormat } = useUserSettings();
  return clockFormat;
}
