import { type Page } from "@playwright/test";
import { test, expect, createNewJob, uniqueName } from "../fixtures";

// Narrows the shared account's list to this test's jobs, in display order.
async function searchRows(page: Page, prefix: string, count: number) {
  await page.getByPlaceholder("Search jobs...").fill(prefix);
  const rows = page.locator("tbody tr").filter({ hasText: prefix });
  await expect(rows).toHaveCount(count);
  return rows;
}

test.describe("Jobs list", () => {
  test("exports every job as a CSV file", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer csv export");
    await page.goto("/dashboard/myjobs");
    await createNewJob(page, jobText, cleanup);

    await page.getByRole("button", { name: "Export jobs" }).click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Export" })
      .click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(
      /^jobsync-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of await download.createReadStream()) {
      chunks.push(chunk as Buffer);
    }
    const csv = Buffer.concat(chunks).toString("utf8");
    expect(csv.split(/\r?\n/)[0]).toContain("JobTitle");
    expect(csv).toContain(jobText);
  });

  test("sorts by title both ways and keeps unapplied jobs last by date", async ({
    page,
    cleanup,
  }) => {
    const prefix = uniqueName("sortable");
    const alpha = `${prefix} alpha`;
    const bravo = `${prefix} bravo`;
    await page.goto("/dashboard/myjobs");
    // alpha stays a draft (no Date Applied); bravo is applied.
    await createNewJob(page, alpha, cleanup);
    await createNewJob(page, bravo, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("radio", { name: "Applied", exact: true }).click();
      },
    });

    // Default order is newest first.
    const rows = await searchRows(page, prefix, 2);
    await expect(rows.nth(0)).toContainText(bravo);

    const titleHeader = page.getByRole("columnheader", { name: "Title" });
    await titleHeader.getByRole("button").click();
    await expect(titleHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(rows.nth(0)).toContainText(alpha);
    await expect(rows.nth(1)).toContainText(bravo);

    await titleHeader.getByRole("button").click();
    await expect(titleHeader).toHaveAttribute("aria-sort", "descending");
    await expect(rows.nth(0)).toContainText(bravo);
    await expect(rows.nth(1)).toContainText(alpha);

    // Blanks sort last in both directions (Postgres puts NULLs first on DESC).
    const appliedHeader = page.getByRole("columnheader", { name: "Applied" });
    await appliedHeader.getByRole("button").click();
    await expect(appliedHeader).toHaveAttribute("aria-sort", "descending");
    await expect(rows.nth(1)).toContainText(alpha);

    await appliedHeader.getByRole("button").click();
    await expect(appliedHeader).toHaveAttribute("aria-sort", "ascending");
    await expect(rows.nth(1)).toContainText(alpha);
  });
});
