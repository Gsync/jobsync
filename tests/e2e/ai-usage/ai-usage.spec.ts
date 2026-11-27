import { test, expect } from "../fixtures";

test.describe("AI Usage", () => {
  test("loads the summary and switches the date range", async ({ page }) => {
    await page.goto("/dashboard/ai-usage");
    await expect(page.getByRole("heading", { name: "AI Usage" })).toBeVisible();

    const range = page.getByRole("group", { name: "Date range" });
    const buttons = range.getByRole("button");
    const last = buttons.last();
    const label = (await last.textContent())!;
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");

    // Either outcome is a loaded page; the failure message is not.
    const days = label.replace(" days", "");
    await expect(
      page
        .getByText(`No AI calls in the last ${days} days.`)
        .or(page.getByText("Total tokens")),
    ).toBeVisible();
    await expect(page.getByText("Couldn't load AI usage.")).toHaveCount(0);
  });
});
