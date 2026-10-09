import { test, expect } from "@playwright/test";

for (const width of [390, 1280]) {
  for (const colorScheme of ["light", "dark"] as const) {
    test(`public entry at ${width}px in ${colorScheme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        "Your self-hosted workspace for the job search.",
      );
      await expect(page.getByText("Example workspace")).toBeVisible();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth,
        ),
      ).toBe(true);
      await page.getByRole("link", { name: "Sign in", exact: true }).click();
      await expect(page).toHaveURL(/\/signin$/);
      await expect(
        page.getByRole("heading", { name: "Welcome back" }),
      ).toBeVisible();
      await page
        .getByRole("link", { name: "Create Account", exact: true })
        .click();
      await expect(page).toHaveURL(/\/signup$/);
      await expect(page.getByLabel("Full Name")).toBeVisible();
    });
  }
}
