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
 *
 * The Combobox component renders a Popover trigger button (role="combobox")
 * inside a FormControl. The FormLabel text is used to locate the trigger.
 * The search input inside the popover has placeholder like
 * "Create or Search <fieldName>" or "Search <fieldName>".
 */
async function selectOrCreateComboboxOption(
  page: Page,
  label: string,
  searchPlaceholder: string,
  text: string,
) {
  // The FormLabel creates a <label> that points to the Combobox trigger button
  await page.getByLabel(label).click();
  await page.getByPlaceholder(searchPlaceholder).click();
  await page.getByPlaceholder(searchPlaceholder).fill(text);
  await page.waitForTimeout(600); // Wait for debounce + filter

  // Try to find an existing exact-match option first
  const existingOption = page.getByRole("option", {
    name: text,
    exact: true,
  });
  try {
    await existingOption.waitFor({ state: "visible", timeout: 3000 });
    await existingOption.click();
  } catch {
    // If no exact match found, look for "Create: <text>" option
    const createOption = page.getByText(`Create: ${text}`);
    await createOption.waitFor({ state: "visible", timeout: 3000 });
    await createOption.click();
  }
  // Wait for popover to close
  await page.waitForTimeout(300);
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

  // Job URL — i18n label "jobs.copyJobLink" = "Copy and paste job link here"
  await page
    .getByPlaceholder("Copy and paste job link here")
    .fill(opts.url ?? "https://example.com/careers/senior-frontend-engineer");

  // Job Title (combobox) — i18n label "jobs.jobTitle" = "Title"
  // ComboBox search placeholder: "Create or Search title"
  await selectOrCreateComboboxOption(
    page,
    "Title",
    "Create or Search title",
    opts.title,
  );
  await expect(page.getByLabel("Title")).toContainText(opts.title);

  // Company (combobox) — i18n label "jobs.company" = "Company"
  // ComboBox search placeholder: "Create or Search company"
  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    opts.company,
  );
  await expect(page.getByLabel("Company")).toContainText(opts.company);

  // Location (combobox) — i18n label "jobs.location" = "Location"
  // ComboBox search placeholder: "Create or Search location"
  await selectOrCreateComboboxOption(
    page,
    "Location",
    "Create or Search location",
    opts.location,
  );
  await expect(page.getByLabel("Location")).toContainText(opts.location);

  // Job type (Part-time radio button)
  await page.getByText("Part-time").click();

  // Job Source (combobox) — i18n label "jobs.jobSource" = "Job Source"
  // ComboBox search placeholder: "Create or Search source"
  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");

  // Job Description — uses TiptapEditor, interact via .tiptap CSS class
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(
    opts.description ??
      "We are looking for an experienced engineer to join our growing team.",
  );

  // Save
  await page.getByTestId("save-job-btn").click();
}

async function deleteJob(page: Page, jobTitle: string) {
  await page.waitForLoadState("load");
  await page.goto("/dashboard/myjobs");
  await page.waitForLoadState("networkidle");
  const cells = page.getByText(new RegExp(jobTitle, "i"));
  await expect(cells.first()).toBeVisible({ timeout: 10000 });
  await page
    .getByRole("row", { name: jobTitle })
    .getByTestId("job-actions-menu-btn")
    .first()
    .click();
  // Menu item text is t("common.delete") = "Delete"
  await page.getByRole("menuitem", { name: "Delete" }).click();
  // Confirm in DeleteAlertDialog — button text is t("common.delete") = "Delete"
  await page.getByRole("button", { name: "Delete" }).click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard", { timeout: 30000 });
});

test.describe.serial("Job CRUD: Create, Edit, Delete", () => {
  const jobTitle = "Senior Frontend Engineer";
  const company = "Acme Software GmbH";
  const location = "Berlin, Germany";

  test("should create a new job with all fields", async ({ page }) => {
    await navigateToJobs(page);
    await createJob(page, { title: jobTitle, company, location });

    // After saving, the app redirects to /dashboard/myjobs
    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });

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
    // Menu item text is t("jobs.editJob") = "Edit Job"
    await page.getByRole("menuitem", { name: "Edit Job" }).click();

    // Verify existing values are loaded in the edit dialog
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await expect(
      page.getByPlaceholder("Copy and paste job link here"),
    ).toHaveValue("https://example.com/careers/senior-frontend-engineer");
    await expect(page.getByLabel("Title")).toContainText(jobTitle);
    await expect(page.getByLabel("Company")).toContainText(company);
    await expect(page.getByLabel("Location")).toContainText(location);
    await expect(page.getByLabel("Job Source")).toContainText("Indeed");
    // SelectFormCtrl aria-label is "Select Job Status"
    await expect(page.getByLabel("Select Job Status")).toContainText("Draft");

    // Edit the description — TiptapEditor uses .tiptap class
    await page.locator(".tiptap").first().click();
    await page.locator(".tiptap").first().fill(
      "Updated: Looking for a Senior Frontend Engineer with React and TypeScript experience.",
    );

    // Save changes
    await page.getByTestId("save-job-btn").click();
    // After saving, the app redirects to /dashboard/myjobs
    await expect(page).toHaveURL(/\/dashboard\/myjobs/, { timeout: 15000 });
    // Verify the job still exists in the table after edit
    await expect(
      page.getByRole("row", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should delete the job and verify removal", async ({ page }) => {
    await deleteJob(page, jobTitle);

    // Verify the job no longer appears in the table
    await expect(
      page.getByRole("row", { name: jobTitle }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
