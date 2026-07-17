import { randomUUID } from "crypto";
import { test, expect, createNewJob } from "./fixtures";

test.describe("Admin Job Titles search", () => {
  test("filters the job titles list by name from the backend", async ({
    page,
    cleanup,
  }) => {
    // Shared suffix lets one search term match both titles below, without
    // depending on the unfiltered (pagination-sensitive) list — the admin
    // account has 200+ pre-existing job titles, so a brand new row (0
    // applied jobs, tied with many others) isn't guaranteed to land on page
    // 1 of the default listing.
    const suffix = randomUUID().slice(0, 8);
    const titleA = `Data Scientist ${suffix}`;
    const titleB = `DevOps Engineer ${suffix}`;

    await createNewJob(page, titleA, cleanup);
    await createNewJob(page, titleB, cleanup);

    await page.goto("/dashboard/admin?tab=job-titles");
    await page.waitForLoadState("networkidle");

    const searchInput = page.getByPlaceholder("Search job titles...");
    await expect(searchInput).toBeVisible();
    await searchInput.fill(titleA);

    await expect(
      page.getByRole("cell", { name: titleA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: titleB, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(titleB);

    await expect(
      page.getByRole("cell", { name: titleB, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: titleA, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(suffix);

    await expect(
      page.getByRole("cell", { name: titleA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: titleB, exact: true }),
    ).toBeVisible();
  });
});
