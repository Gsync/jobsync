import { randomUUID } from "crypto";
import { type Page } from "@playwright/test";
import {
  test,
  expect,
  uniqueName,
  type CleanupRegistry,
} from "./fixtures";

async function navigateToCompanies(page: Page) {
  await page.goto("/dashboard/admin");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-company-btn").waitFor({ state: "visible" });
}

// Opens the New Company dialog and saves a company with the given name.
// Registers it for teardown as soon as it's persisted. Verifies via the
// search box rather than the unfiltered (page-1, applied-count-ordered)
// list: the admin account has 70+ pre-existing companies, so a brand new
// row (0 applied jobs, tied with many others) isn't guaranteed to land on
// page 1 of the default listing.
async function createCompany(
  page: Page,
  companyName: string,
  cleanup: CleanupRegistry,
) {
  await page.getByTestId("add-company-btn").click();
  await expect(page.getByText("Add Company")).toBeVisible();

  await page.getByLabel("Company Name").fill(companyName);
  await page.getByRole("button", { name: /save/i }).click();
  cleanup.company(companyName);

  // Wait for the dialog to fully close before touching the search box —
  // filling it while the dialog is still closing is a no-op (the input
  // isn't interactable yet), leaving the search term empty.
  await expect(page.getByText("Add Company")).not.toBeVisible();

  const searchInput = page.getByPlaceholder("Search companies...");
  await searchInput.fill(companyName);
  await expect(
    page.getByRole("cell", { name: companyName, exact: true }),
  ).toBeVisible();
  await searchInput.fill("");
}

test.describe("Admin Companies search", () => {
  test("filters the companies list by name from the backend", async ({
    page,
    cleanup,
  }) => {
    // Shared suffix lets one search term match both companies below,
    // without depending on the unfiltered (pagination-sensitive) list.
    const suffix = randomUUID().slice(0, 8);
    const companyA = `Umbrella Corp ${suffix}`;
    const companyB = `Wayne Enterprises ${suffix}`;

    await navigateToCompanies(page);
    await createCompany(page, companyA, cleanup);
    await createCompany(page, companyB, cleanup);

    const searchInput = page.getByPlaceholder("Search companies...");
    await searchInput.fill(companyA);

    await expect(
      page.getByRole("cell", { name: companyA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: companyB, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(companyB);

    await expect(
      page.getByRole("cell", { name: companyB, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: companyA, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(suffix);

    await expect(
      page.getByRole("cell", { name: companyA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: companyB, exact: true }),
    ).toBeVisible();
  });

  test("shows no rows for a search term that matches nothing", async ({
    page,
    cleanup,
  }) => {
    const companyName = uniqueName("Stark Industries");

    await navigateToCompanies(page);
    await createCompany(page, companyName, cleanup);

    const searchInput = page.getByPlaceholder("Search companies...");
    await searchInput.fill(uniqueName("no-such-company"));

    await expect(
      page.getByRole("cell", { name: companyName, exact: true }),
    ).not.toBeVisible();
  });
});
