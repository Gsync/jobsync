import { test, expect } from "@playwright/test";

test("Login page has title", async ({ page }) => {
  await page.goto("localhost:3000");

  await expect(page).toHaveTitle("Signin | JobSync");

  await expect(
    page.getByRole("heading", { name: "JobSync - Job Search Assistant" })
  ).toBeVisible();

  await expect(page.getByRole("heading", { name: "Login" })).toBeVisible();
});

test("get started link", async ({ page }) => {
  await page.goto("https://playwright.dev/");

  // Click the get started link.
  await page.getByRole("link", { name: "Get started" }).click();

  // Expects page to have a heading with the name of Installation.
  await expect(
    page.getByRole("heading", { name: "Installation" })
  ).toBeVisible();
});
