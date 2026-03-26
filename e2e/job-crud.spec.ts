import { test, expect, type Page } from "@playwright/test";
import { selectOrCreateComboboxOption } from "./helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function navigateToJobs(page: Page) {
  await page.goto("/dashboard/myjobs");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-job-btn").waitFor({ state: "visible" });
}

async function createJob(
  page: Page,
  opts: {
    title: string;
    company: string;
    location: string;
    url?: string;
    description?: string;
  },
) {
  await page.getByTestId("add-job-btn").click();
  await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();

  await page
    .getByPlaceholder("Copy and paste job link here")
    .fill(opts.url ?? "https://example.com/careers/e2e-test");

  await selectOrCreateComboboxOption(
    page,
    "Title",
    "Create or Search title",
    opts.title,
  );
  await expect(page.getByLabel("Title")).toContainText(opts.title);

  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    opts.company,
  );
  await expect(page.getByLabel("Company")).toContainText(opts.company);

  await selectOrCreateComboboxOption(
    page,
    "Location",
    "Create or Search location",
    opts.location,
  );
  await expect(page.getByLabel("Location")).toContainText(opts.location);

  await page.getByText("Part-time").click();

  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");

  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(
    opts.description ?? "E2E test job description.",
  );

  await page.getByTestId("save-job-btn").click();
}

async function deleteJob(page: Page, jobTitle: string) {
  await page.goto("/dashboard/myjobs");
  await page.waitForLoadState("networkidle");
  const cells = page.getByText(new RegExp(jobTitle, "i"));
  await expect(cells.first()).toBeVisible({ timeout: 10000 });
  await page
    .getByRole("row", { name: jobTitle })
    .getByTestId("job-actions-menu-btn")
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
}

// ---------------------------------------------------------------------------
// Tests — each test is self-contained (create → assert → cleanup)
// ---------------------------------------------------------------------------

// storageState handles authentication — no per-test login needed

test.describe("Job CRUD", () => {
  test("should create a new job with all fields", async ({ page }) => {
    const uid = Date.now().toString(36);
    const jobTitle = `E2E Job ${uid}`;
    const company = `E2E Company ${uid}`;
    const location = `E2E Location ${uid}`;

    await navigateToJobs(page);
    await createJob(page, { title: jobTitle, company, location });

    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });
    await expect(
      page.getByRole("row", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await deleteJob(page, jobTitle);
  });

  test("should edit the job description and verify updated values", async ({
    page,
  }) => {
    const uid = Date.now().toString(36);
    const jobTitle = `E2E Job ${uid}`;
    const company = `E2E Company ${uid}`;
    const location = `E2E Location ${uid}`;

    // Create
    await navigateToJobs(page);
    await createJob(page, { title: jobTitle, company, location });
    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });

    // Edit
    await page
      .getByRole("row", { name: jobTitle })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();

    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await expect(page.getByLabel("Title")).toContainText(jobTitle);
    await expect(page.getByLabel("Company")).toContainText(company);
    await expect(page.getByLabel("Location")).toContainText(location);
    await expect(page.getByLabel("Job Source")).toContainText("Indeed");
    await expect(page.getByLabel("Select Job Status")).toContainText("Draft");

    await page.locator(".tiptap").first().click();
    await page.locator(".tiptap").first().fill(
      "Updated: E2E test description with React and TypeScript.",
    );
    await page.getByTestId("save-job-btn").click();

    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });
    await expect(
      page.getByRole("row", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await deleteJob(page, jobTitle);
  });

  test("should delete the job and verify removal", async ({ page }) => {
    const uid = Date.now().toString(36);
    const jobTitle = `E2E Job ${uid}`;
    const company = `E2E Company ${uid}`;
    const location = `E2E Location ${uid}`;

    // Create first
    await navigateToJobs(page);
    await createJob(page, { title: jobTitle, company, location });
    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });
    await expect(
      page.getByRole("row", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Delete
    await deleteJob(page, jobTitle);

    // Verify removed
    await expect(
      page.getByRole("row", { name: jobTitle }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
