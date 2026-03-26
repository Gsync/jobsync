import { defineConfig, devices } from "@playwright/test";

const chromiumOptions = {
  ...devices["Desktop Chrome"],
  launchOptions: {
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  },
};

export default defineConfig({
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 4,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./e2e/global-setup.ts",

  use: {
    baseURL: "http://localhost:3737",
    actionTimeout: 10_000,
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "smoke",
      testDir: "./e2e/smoke",
      use: { ...chromiumOptions },
      // NO storageState — these tests verify the auth flow itself
    },
    {
      name: "crud",
      testDir: "./e2e/crud",
      use: {
        ...chromiumOptions,
        storageState: "e2e/.auth/user.json",
      },
    },
  ],

  webServer: {
    command: "bun run dev",
    url: "http://localhost:3737",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
