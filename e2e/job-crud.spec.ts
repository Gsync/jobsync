import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

async function navigateToJobs(page: Page) {
  await page.goto("/dashboard/myjobs");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-job-btn").waitFor({ state: "visible" });
}

/**
 * Fill and select a combobox option, creating it if it does not already exist.
 */
async function selectOrCreateComboboxOption(
  page: Page,
  label: string,
  searchPlaceholder: string,
  text: string,
) {
  await page.getByLabel(label).click();
  await page.getByPlaceholder(searchPlaceholder).click();
  await page.getByPlaceholder(searchPlaceholder).fill(text);
  await page.waitForTimeout(500); // Wait for debounce
  const existingOption = page.getByRole("option", {
    name: text,
    exact: true,
  });
  const createOption = page.getByText(`Create: ${text}`);
  if (await existingOption.isVisible()) {
    await existingOption.click();
  } else if (await createOption.isVisible()) {
    await createOption.click();
  }
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

  // Job URL
  await page
    .getByPlaceholder("Copy and paste job link here")
    .fill(opts.url ?? "https://example.com/careers/senior-frontend-engineer");

  // Job Title (combobox)
  await selectOrCreateComboboxOption(
    page,
    "Job Title",
    "Create or Search title",
    opts.title,
  );
  await expect(page.getByLabel("Job Title")).toContainText(opts.title);

  // Company (combobox)
  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    opts.company,
  );
  await expect(page.getByLabel("Company")).toContainText(opts.company);

  // Location (combobox)
  await selectOrCreateComboboxOption(
    page,
    "Job Location",
    "Create or Search location",
    opts.location,
  );
  await expect(page.getByLabel("Job Location")).toContainText(opts.location);

  // Job type (Part-time radio button)
  await page.getByText("Part-time").click();

  // Job Source (combobox)
  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");

  // Job Description
  await page.getByLabel("Job Description").locator("div").click();
  await page
    .getByLabel("Job Description")
    .locator("div")
    .fill(
      opts.description ??
        "We are looking for an experienced engineer to join our growing team.",
    );

  // Save
  await page.getByTestId("save-job-btn").click();
}

async function deleteJob(page: Page, jobTitle: string) {
  await page.waitForLoadState("load");
  await page.goto("/dashboard/myjobs");
  const cells = page.getByText(new RegExp(jobTitle, "i"));
  await expect(cells.first()).toBeVisible();
  await page
    .getByRole("row", { name: jobTitle })
    .getByTestId("job-actions-menu-btn")
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard");
});

test.describe.serial("Job CRUD: Create, Edit, Delete", () => {
  const jobTitle = "Senior Frontend Engineer";
  const company = "Acme Software GmbH";
  const location = "Berlin, Germany";

  test("should create a new job with all fields", async ({ page }) => {
    await navigateToJobs(page);
    await createJob(page, { title: jobTitle, company, location });

    // After saving, the app redirects to /dashboard/myjobs
    await expect(page).toHaveURL(/\/dashboard\/myjobs/);

    // Verify job appears in the table
    await expect(
      page.getByRole("row", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should edit the job title and verify updated values", async ({
    page,
  }) => {
    await navigateToJobs(page);

    // Open the job actions menu and click edit
    await page
      .getByRole("row", { name: jobTitle })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();

    // Verify existing values are loaded in the edit dialog
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await expect(
      page.getByPlaceholder("Copy and paste job link here"),
    ).toHaveValue("https://example.com/careers/senior-frontend-engineer");
    await expect(page.getByLabel("Job Title")).toContainText(jobTitle);
    await expect(page.getByLabel("Company")).toContainText(company);
    await expect(page.getByLabel("Job Location")).toContainText(location);
    await expect(page.getByLabel("Job Source")).toContainText("Indeed");
    await expect(page.getByLabel("Select Job Status")).toContainText("Draft");

    // Edit the description
    await page
      .getByLabel("Job Description")
      .locator("div")
      .first()
      .click();
    await page
      .getByLabel("Job Description")
      .locator("div")
      .first()
      .fill(
        "Updated: Looking for a Senior Frontend Engineer with React and TypeScript experience.",
      );

    // Save changes
    await page.getByTestId("save-job-btn").click();
    await expect(page.getByRole("status").first()).toContainText(
      /Job has been updated/,
    );
  });

  test("should delete the job and verify removal", async ({ page }) => {
    await deleteJob(page, jobTitle);

    // Verify the job no longer appears in the table
    await expect(
      page.getByRole("row", { name: jobTitle }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
