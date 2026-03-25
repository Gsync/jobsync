/**
 * Tests for DeveloperSettings in src/models/userSettings.model.ts
 *
 * Verifies the default settings shape and that the DeveloperSettings
 * interface is correctly integrated into UserSettingsData.
 */

import {
  defaultUserSettings,
  type DeveloperSettings,
  type UserSettingsData,
} from "@/models/userSettings.model";

describe("DeveloperSettings defaults", () => {
  it("defaultUserSettings includes developer property", () => {
    expect(defaultUserSettings.developer).toBeDefined();
  });

  it("debugLogging defaults to true", () => {
    expect(defaultUserSettings.developer!.debugLogging).toBe(true);
  });

  it("all logCategories default to true", () => {
    const cats = defaultUserSettings.developer!.logCategories;
    expect(cats.scheduler).toBe(true);
    expect(cats.runner).toBe(true);
    expect(cats.automationLogger).toBe(true);
  });

  it("developer property is optional on UserSettingsData", () => {
    // This is a type-level check — if it compiles, the test passes.
    const settingsWithout: UserSettingsData = {
      ai: defaultUserSettings.ai,
      display: defaultUserSettings.display,
    };
    expect(settingsWithout.developer).toBeUndefined();
  });

  it("DeveloperSettings type has expected shape", () => {
    const dev: DeveloperSettings = {
      debugLogging: false,
      logCategories: {
        scheduler: false,
        runner: true,
        automationLogger: false,
      },
    };
    expect(dev.debugLogging).toBe(false);
    expect(dev.logCategories.runner).toBe(true);
  });
});
