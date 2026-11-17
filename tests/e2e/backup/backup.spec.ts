import { test, expect } from "../fixtures";

test.describe("data backup", () => {
  test("exports a non-empty zip", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Data" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /download backup/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^jobsync-backup-\d{4}-\d{2}-\d{2}\.zip$/);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const bytes = Buffer.concat(chunks);
    expect(bytes.length).toBeGreaterThan(100);
    // Local file header signature.
    expect(bytes.subarray(0, 2).toString()).toBe("PK");
  });

  // Stops at the confirmation on purpose: committing an import here would wipe
  // the shared dev account every other spec depends on.
  test("previews a backup without touching anything and requires confirmation", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Data" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("link", { name: /download backup/i }).click();
    const download = await downloadPromise;
    const zipPath = await download.path();

    await page.getByLabel(/backup file/i).setInputFiles(zipPath!);

    await expect(page.getByText(/exported/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /replace my data with this backup/i }),
    ).toBeVisible();

    await page
      .getByRole("button", { name: /replace my data with this backup/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /delete this account's data\?/i }),
    ).toBeVisible();

    // Cancel — nothing is imported.
    await page.getByRole("button", { name: /^cancel$/i }).click();
    await expect(
      page.getByRole("heading", { name: /delete this account's data\?/i }),
    ).toBeHidden();
  });
});
