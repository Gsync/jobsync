"use server";
import { cookies } from "next/headers";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { ActionResult } from "@/models/actionResult";
import { getCurrentUser } from "@/utils/user.utils";
import {
  UserSettingsData,
  defaultUserSettings,
  AiSettings,
  DisplaySettings,
} from "@/models/userSettings.model";

export const getUserSettings = async (): Promise<ActionResult<unknown>> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const userSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    if (!userSettings) {
      return {
        success: true,
        data: {
          userId: user.id,
          settings: defaultUserSettings,
        },
      };
    }

    const settings: UserSettingsData = JSON.parse(userSettings.settings);

    return {
      success: true,
      data: {
        userId: user.id,
        settings: {
          ...defaultUserSettings,
          ...settings,
        },
      },
    };
  } catch (error) {
    const msg = "Failed to fetch user settings.";
    return handleError(error, msg);
  }
};

export const updateUserSettings = async (
  settings: Partial<UserSettingsData>
): Promise<ActionResult<unknown>> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const existingSettings = await prisma.userSettings.findUnique({
      where: { userId: user.id },
    });

    let mergedSettings: UserSettingsData;

    if (existingSettings) {
      const currentSettings: UserSettingsData = JSON.parse(
        existingSettings.settings
      );
      mergedSettings = {
        ...defaultUserSettings,
        ...currentSettings,
        ...settings,
        ai: {
          ...defaultUserSettings.ai,
          ...currentSettings.ai,
          ...settings.ai,
        },
        display: {
          ...defaultUserSettings.display,
          ...currentSettings.display,
          ...settings.display,
        },
      };
    } else {
      mergedSettings = {
        ...defaultUserSettings,
        ...settings,
        ai: { ...defaultUserSettings.ai, ...settings.ai },
        display: { ...defaultUserSettings.display, ...settings.display },
      };
    }

    const userSettings = await prisma.userSettings.upsert({
      where: { userId: user.id },
      update: {
        settings: JSON.stringify(mergedSettings),
      },
      create: {
        userId: user.id,
        settings: JSON.stringify(mergedSettings),
      },
    });

    const parsedSettings: UserSettingsData = JSON.parse(userSettings.settings);

    return {
      success: true,
      data: {
        userId: user.id,
        settings: parsedSettings,
      },
    };
  } catch (error) {
    const msg = "Failed to update user settings.";
    return handleError(error, msg);
  }
};

export const updateAiSettings = async (
  aiSettings: AiSettings
): Promise<ActionResult<unknown>> => {
  return updateUserSettings({ ai: aiSettings });
};

export const updateDisplaySettings = async (
  displaySettings: DisplaySettings
): Promise<ActionResult<unknown>> => {
  // Sync locale to cookie for server-side access without DB query
  if (displaySettings.locale) {
    const cookieStore = await cookies();
    cookieStore.set("NEXT_LOCALE", displaySettings.locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }
  return updateUserSettings({ display: displaySettings });
};
