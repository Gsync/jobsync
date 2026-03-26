import { expect, type Page } from "@playwright/test";

/** Generate a unique identifier for test data (e.g. "m1abc2d"). */
export function uniqueId(): string {
  return Date.now().toString(36);
}

/** Perform UI login. Only needed in tests that don't use storageState. */
export async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

/** Wait for a toast notification matching the given pattern. */
export async function expectToast(
  page: Page,
  pattern: RegExp,
  timeout = 10000,
) {
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout });
}

/**
 * Fill and select a combobox option, creating it if it does not already exist.
 * Uses 3-step fallback: exact match → partial match → create.
 */
export async function selectOrCreateComboboxOption(
  page: Page,
  label: string,
  searchPlaceholder: string,
  text: string,
  timeout = 3000,
) {
  await page.getByLabel(label).click();
  await page.getByPlaceholder(searchPlaceholder).click();
  await page.getByPlaceholder(searchPlaceholder).fill(text);
  await page.waitForTimeout(600);

  const exactOption = page.getByRole("option", { name: text, exact: true });
  const partialOption = page
    .getByRole("option", { name: new RegExp(text, "i") })
    .first();
  const createOption = page.getByText(`Create: ${text}`);

  try {
    await exactOption.waitFor({ state: "visible", timeout });
    await exactOption.click();
  } catch {
    try {
      await partialOption.waitFor({ state: "visible", timeout });
      await partialOption.click();
    } catch {
      await createOption.waitFor({ state: "visible", timeout });
      await createOption.click();
    }
  }
  await page.waitForTimeout(300);
}
