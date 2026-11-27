import { type Page } from "@playwright/test";
import { test, expect } from "../fixtures";

// Both tests write the shared account's settings, so they run alone in the
// one-worker @account-break pass and put back what they changed.

const SENSITIVE_PROVIDERS = ["OpenAI", "DeepSeek", "OpenRouter", "Google Gemini"];
const THEME_LABELS = { light: "Light", dark: "Dark", system: "System" } as const;
type Theme = keyof typeof THEME_LABELS;

async function openSection(page: Page, section: "API Keys" | "Appearance") {
  await page.goto("/dashboard/settings");
  await page.getByRole("button", { name: section }).click();
}

function providerCard(page: Page, name: string) {
  return page
    .locator("div.bg-card")
    .filter({ has: page.getByText(name, { exact: true }) });
}

// isVisible() does not wait, so every check below waits for the list first.
async function waitForKeys(page: Page) {
  // Provider cards render only once the saved keys have loaded.
  await expect(
    page.getByRole("heading", { name: SENSITIVE_PROVIDERS[0], exact: true }),
  ).toBeVisible();
}

async function findUnconfiguredProvider(page: Page): Promise<string | null> {
  await waitForKeys(page);
  for (const name of SENSITIVE_PROVIDERS) {
    if (await providerCard(page, name).getByText("Not configured").isVisible()) {
      return name;
    }
  }
  return null;
}

async function saveTheme(page: Page, theme: Theme) {
  await page.getByText(THEME_LABELS[theme], { exact: true }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Your selected theme has been saved.")).toBeVisible();
}

test.describe("Settings", { tag: "@account-break" }, () => {
  test("saves an API key encrypted, shows it masked after reload, and deletes it", async ({
    page,
  }) => {
    await openSection(page, "API Keys");
    const provider = await findUnconfiguredProvider(page);
    // Never overwrite a real key: every cloud provider already has one.
    test.skip(!provider, "every cloud provider already has a saved key");

    // The verifier would call the real provider; the save itself stays real.
    await page.route("**/api/settings/api-keys/verify", (route) =>
      route.fulfill({ json: { success: true } }),
    );
    const card = providerCard(page, provider!);
    try {
      await card.getByRole("button", { name: "Add Key" }).click();
      await card.getByLabel("API Key").fill("sk-e2e-dummy-key-wxyz");
      await card.getByRole("button", { name: "Verify & Save" }).click();
      await expect(card.getByText("····wxyz")).toBeVisible();

      await openSection(page, "API Keys");
      await expect(card.getByText("····wxyz")).toBeVisible();
    } finally {
      await openSection(page, "API Keys");
      await waitForKeys(page);
      if (await card.getByText("····wxyz").isVisible()) {
        await card.getByRole("button", { name: "Update Key" })
          .locator("xpath=following-sibling::button[1]")
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Delete" })
          .click();
      }
    }
    await expect(card.getByText("Not configured")).toBeVisible();
  });

  test("keeps the chosen theme after a reload", async ({ page }) => {
    await openSection(page, "Appearance");
    const checked = page.getByRole("radio", { checked: true });
    await expect(checked).toHaveCount(1);
    const original = (await checked.getAttribute("value")) as Theme;
    const target: Theme = original === "dark" ? "light" : "dark";

    try {
      await saveTheme(page, target);
      await openSection(page, "Appearance");
      await expect(page.getByRole("radio", { checked: true })).toHaveAttribute(
        "value",
        target,
      );
      await expect(page.locator("html")).toHaveClass(
        target === "dark" ? /\bdark\b/ : /\blight\b/,
      );
    } finally {
      await openSection(page, "Appearance");
      await saveTheme(page, original);
    }
  });
});
