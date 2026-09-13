import { randomUUID } from "crypto";
import { type Page } from "@playwright/test";
import {
  test,
  expect,
  createNewJob,
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
  options?: { websiteUrl?: string; industry?: string },
) {
  await page.getByTestId("add-company-btn").click();
  await expect(page.getByText("Add Company")).toBeVisible();

  await page.getByLabel("Company Name").fill(companyName);
  if (options?.websiteUrl) {
    await page.getByLabel("Website", { exact: true }).fill(options.websiteUrl);
  }
  if (options?.industry) {
    await page.getByLabel("Industry", { exact: true }).fill(options.industry);
  }
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

// The list is paginated, so narrow it with the search box. Starts from a fresh
// load: createCompany's search-clear reloads instantly while a new search waits
// out a 300ms debounce, so a leftover row can vanish mid-click. Waiting for
// header + one row means the filtered response has rendered.
async function searchCompanyRow(page: Page, name: string) {
  await navigateToCompanies(page);
  await page.getByPlaceholder("Search companies...").fill(name);
  await expect(page.getByRole("row")).toHaveCount(2);
  return page.getByRole("row").filter({ hasText: name });
}

async function openRowMenuItem(page: Page, name: string, item: string) {
  const row = await searchCompanyRow(page, name);
  await row.getByRole("button", { name: "Toggle menu" }).click();
  await page.getByRole("menuitem", { name: item }).click();
}

test.describe("Admin Companies", () => {
  test("adds a company and shows its details page", async ({
    page,
    cleanup,
  }) => {
    const companyName = uniqueName("Initech");
    const industry = uniqueName("Financial Services");

    await navigateToCompanies(page);
    await createCompany(page, companyName, cleanup, {
      websiteUrl: "https://initech.example.com",
      industry,
    });

    await searchCompanyRow(page, companyName);
    await page.getByRole("link", { name: companyName, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/companies\//);
    await expect(
      page.getByRole("heading", { name: companyName, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(`${industry} · initech.example.com`),
    ).toBeVisible();
  });

  test("edits a company's name and industry", async ({ page, cleanup }) => {
    const companyName = uniqueName("Globex");
    const renamed = uniqueName("Globex Renamed");
    const industry = uniqueName("Energy");

    await navigateToCompanies(page);
    await createCompany(page, companyName, cleanup);
    await openRowMenuItem(page, companyName, "Edit Company");

    const dialog = page.getByRole("dialog");
    await expect(
      dialog.getByRole("heading", { name: "Edit Company" }),
    ).toBeVisible();
    await expect(dialog.getByLabel("Company Name")).toHaveValue(companyName);
    await dialog.getByLabel("Company Name").fill(renamed);
    await dialog.getByLabel("Industry", { exact: true }).fill(industry);
    // Cleanup matches on the stored value, which the rename replaces
    cleanup.company(renamed);
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(
      (await searchCompanyRow(page, renamed)).getByRole("link", {
        name: renamed,
        exact: true,
      }),
    ).toBeVisible();

    await page.getByRole("link", { name: renamed, exact: true }).click();
    await expect(
      page.getByRole("heading", { name: renamed, exact: true }),
    ).toBeVisible();
    // Shown twice: the header subtitle and the summary card's Industry fact
    await expect(page.getByText(industry, { exact: true })).toHaveCount(2);
  });

  test("deletes a company", async ({ page, cleanup }) => {
    const companyName = uniqueName("Hooli");

    await navigateToCompanies(page);
    await createCompany(page, companyName, cleanup);
    await openRowMenuItem(page, companyName, "Delete");

    const alert = page.getByRole("alertdialog");
    await expect(alert).toContainText(
      "Are you sure you want to delete this company?",
    );
    await alert.getByRole("button", { name: "Delete" }).click();
    await expect(alert).not.toBeVisible();

    await expect(
      page.getByRole("row").filter({ hasText: companyName }),
    ).toHaveCount(0);
  });

  test("refuses to delete a company with an associated job", async ({
    page,
    cleanup,
  }) => {
    const companyName = uniqueName("Massive Dynamic");
    const jobText = uniqueName("company delete job");

    await createNewJob(page, jobText, cleanup, { company: companyName });
    await navigateToCompanies(page);
    await openRowMenuItem(page, companyName, "Delete");

    const alert = page.getByRole("alertdialog");
    await expect(alert).toContainText("Associated jobs exist!");
    await expect(alert).toContainText("1 associated job");
    await expect(alert.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });
});
