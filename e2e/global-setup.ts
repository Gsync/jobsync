import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseURL =
    config.projects[0]?.use?.baseURL ?? "http://localhost:3737";
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const page = await browser.newPage();

  await page.goto(`${baseURL}/signin`);
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
  await page.waitForURL("**/dashboard", { timeout: 15000 });

  await page.context().storageState({ path: "e2e/.auth/user.json" });
  await browser.close();
}

export default globalSetup;
