// Uses the base Playwright `test` (not ./fixtures): these tests exercise auth
// from a logged-out state, so they must NOT use the auto-login `page` fixture.
// They create no records, so there is nothing to clean up.
import { test, expect } from "@playwright/test";
import { login } from "./fixtures";

test("Signin page has title", async ({ page }) => {
  await page.goto("/");

  await expect(page).toHaveTitle("Sign In | JobSync");

  await expect(page.getByRole("heading", { name: "JobSync" })).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});

test("Signin and out from app", async ({ page, baseURL }) => {
  await page.goto("/");
  await login(page);

  await expect(page).toHaveURL(baseURL + "/dashboard");

  await page.getByRole("button", { name: "Avatar" }).click();
  await page.getByRole("button", { name: "Logout" }).click();

  await expect(
    page.getByRole("heading", { name: "Welcome back" }),
  ).toBeVisible();
});
