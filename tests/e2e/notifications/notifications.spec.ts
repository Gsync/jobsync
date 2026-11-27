import { test, expect } from "../fixtures";

// Read-only: Mark all read / Clear all would rewrite the shared account's
// real notifications, so neither is clicked here.
test.describe("Notifications", () => {
  test("opens the bell popover, switches tabs, and follows View all", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(
      page.getByRole("heading", { name: "Notifications" }),
    ).toBeVisible();

    const errorsTab = page.getByRole("tab", { name: /^Errors/ });
    await errorsTab.click();
    await expect(errorsTab).toHaveAttribute("aria-selected", "true");

    await page.getByRole("link", { name: "View all notifications" }).click();
    await expect(page).toHaveURL(/\/dashboard\/notifications$/);
    await expect(page.getByText("Notifications", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Automation" })).toBeVisible();
  });
});
