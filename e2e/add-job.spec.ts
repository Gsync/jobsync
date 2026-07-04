import { test, expect, type Page } from "@playwright/test";
import { addDays, format } from "date-fns";

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard");
});

async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

async function createNewJob(
  page: Page,
  jobText: string,
  options?: {
    skipUrl?: boolean;
    beforeSave?: (page: Page) => Promise<void>;
  },
): Promise<string> {
  const suffix = jobText.replace(/\s+/g, "-");
  const companyText = `company ${suffix}`;
  const locationText = `location ${suffix}`;

  await page.getByRole("button", { name: "New Job" }).click();
  await expect(page).toHaveURL(/\/dashboard\/myjobs/);
  // Dashboard's "New Job" button auto-opens the dialog via ?add-job=true,
  // so the dialog is already open here (no need to click add-job-btn again).
  await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
  if (!options?.skipUrl) {
    await page
      .getByPlaceholder("Copy and paste job link here")
      .fill("www.google.com");
  }
  await page.getByLabel("Job Title").click();
  await page.getByPlaceholder("Create or Search title").click();
  await page.getByPlaceholder("Create or Search title").fill(jobText);
  await page.waitForTimeout(500); // Wait for debounce
  // Check if item exists in list or needs to be created
  const existingOption = page.getByRole("option", {
    name: jobText,
    exact: true,
  });
  const createOption = page.getByText(`Create: ${jobText}`);
  if (await existingOption.isVisible()) {
    await existingOption.click();
  } else if (await createOption.isVisible()) {
    await createOption.click();
  }
  await expect(page.getByLabel("Job Title")).toContainText(jobText);
  await page.getByLabel("Company").click();
  await page.getByPlaceholder("Create or Search company").click();
  await page.getByPlaceholder("Create or Search company").fill(companyText);
  await page.waitForTimeout(500); // Wait for debounce
  // Check if item exists in list or needs to be created
  const existingCompany = page.getByRole("option", {
    name: companyText,
    exact: true,
  });
  const createCompany = page.getByText(`Create: ${companyText}`);
  if (await existingCompany.isVisible()) {
    await existingCompany.click();
  } else if (await createCompany.isVisible()) {
    await createCompany.click();
  }
  await expect(page.getByLabel("Company")).toContainText(companyText);
  await page.getByLabel("Job Location").click();
  await page.getByPlaceholder("Create or Search location").click();
  await page.getByPlaceholder("Create or Search location").fill(locationText);
  await page.waitForTimeout(500); // Wait for debounce
  // Check if item exists in list or needs to be created
  const existingLocation = page.getByRole("option", {
    name: locationText,
    exact: true,
  });
  const createLocation = page.getByText(`Create: ${locationText}`);
  if (await existingLocation.isVisible()) {
    await existingLocation.click();
  } else if (await createLocation.isVisible()) {
    await createLocation.click();
  }
  await expect(page.getByLabel("Job Location")).toContainText(locationText);
  await page.getByText("Part-time").click();
  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");
  await page.getByLabel("Job Description").locator("div").click();
  await page
    .getByLabel("Job Description")
    .locator("div")
    .fill("test description");
  if (options?.beforeSave) {
    await options.beforeSave(page);
  }
  await page.getByTestId("save-job-btn").click();

  // Job Title/Company/Location text is stable across runs (reused via the
  // combobox's "search or create" flow, backed by a unique DB constraint),
  // so old duplicate rows from prior runs can share this same jobText.
  // Grab the newly created job's id from its row link (jobs are sorted
  // newest-first) so cleanup can target this exact job instead of matching
  // by name.
  const row = page.getByRole("row", { name: jobText }).first();
  await expect(row).toBeVisible();
  const href = await row.getByRole("link", { name: jobText }).getAttribute("href");
  return href!.split("/").pop()!;
}

async function deleteJobById(page: Page, jobId: string) {
  // Wait for any pending navigations to complete before navigating
  await page.waitForLoadState("load");
  await page.goto("/dashboard/myjobs");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("row").filter({
    has: page.locator(`a[href="/dashboard/myjobs/${jobId}"]`),
  });
  await expect(row).toBeVisible({ timeout: 10000 });
  await row.getByTestId("job-actions-menu-btn").click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  await expect(row).not.toBeVisible({ timeout: 10000 });
}

test.describe("Add New Job", () => {
  let jobIdToCleanup: string | undefined;

  test.afterEach(async ({ page }) => {
    if (jobIdToCleanup) {
      await deleteJobById(page, jobIdToCleanup);
      jobIdToCleanup = undefined;
    }
  });

  test("should allow me to add a new job", async ({ page }, testInfo) => {
    const jobText = `developer test title 1 ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText);
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();
  });

  test("should edit the job created", async ({ page }, testInfo) => {
    const jobText = `developer test title 2 ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText);
    const cell = page.getByText(jobText).first();
    await expect(cell).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(
      page.getByPlaceholder("Copy and paste job link here"),
    ).toHaveValue("www.google.com");
    await expect(page.getByLabel("Job Title")).toContainText(
      "developer test title",
    );
    await expect(page.getByLabel("Company")).toContainText(
      `company ${jobText.replace(/\s+/g, "-")}`,
    );
    await expect(page.getByLabel("Job Location")).toContainText(
      `location ${jobText.replace(/\s+/g, "-")}`,
    );
    await expect(page.getByLabel("Job Source")).toContainText("Indeed");
    await expect(page.getByLabel("Select Job Status")).toContainText("Draft");
    await expect(page.getByRole("paragraph")).toContainText("test description");
    await page.getByText("test description").click();
    await page
      .getByLabel("Job Description")
      .locator("div")
      .fill("test description edited");
    await page.getByTestId("save-job-btn").click();
    await expect(page.getByRole("status").first()).toContainText(
      /Job has been updated/,
    );
  });

  test("should delete a job", async ({ page }, testInfo) => {
    const jobText = `developer test title delete ${testInfo.project.name}`;
    await createNewJob(page, jobText);
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page.getByRole("status").first()).toContainText(
      /Job has been deleted/,
    );
    await expect(page.getByRole("row", { name: jobText })).not.toBeVisible();
  });

  test("should save a job without a job url", async ({ page }, testInfo) => {
    const jobText = `developer test title no url ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText, { skipUrl: true });
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(
      page.getByPlaceholder("Copy and paste job link here"),
    ).toHaveValue("");
  });

  test("should persist applied status and date applied after saving", async ({
    page,
  }, testInfo) => {
    const jobText = `developer test title applied ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText, {
      beforeSave: async (page) => {
        await page.getByRole("switch").click();
      },
    });
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByRole("switch")).toBeChecked();
    await expect(page.getByLabel("Select Job Status")).toContainText(
      "Applied",
    );
    await expect(page.getByLabel("Date Applied")).toContainText(
      format(new Date(), "PP"),
    );
  });

  test("should persist selected salary range after saving", async ({
    page,
  }, testInfo) => {
    const jobText = `developer test title salary ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText, {
      beforeSave: async (page) => {
        await page.getByLabel("Select Salary Range").click();
        await page
          .getByRole("option", { name: "40,000 - 50,000", exact: true })
          .click();
      },
    });
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByLabel("Select Salary Range")).toContainText(
      "40,000 - 50,000",
    );
  });

  test("should persist selected due date after saving", async ({
    page,
  }, testInfo) => {
    const jobText = `developer test title due date ${testInfo.project.name}`;
    const expectedDueDate = format(addDays(new Date(), 7), "PP");
    jobIdToCleanup = await createNewJob(page, jobText, {
      beforeSave: async (page) => {
        await page.getByLabel("Due Date").click();
        await page.getByText("Select Preset").click();
        await page.getByRole("option", { name: "In a week" }).click();
      },
    });
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByLabel("Due Date")).toContainText(expectedDueDate);
  });

  test("should add and persist a note on an existing job", async ({
    page,
  }, testInfo) => {
    const jobText = `developer test title note ${testInfo.project.name}`;
    jobIdToCleanup = await createNewJob(page, jobText);
    await expect(
      page.getByRole("row", { name: jobText }).first(),
    ).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();

    await page.getByRole("button", { name: "New Note" }).click();
    const noteContainer = page
      .getByText("Add Note", { exact: true })
      .locator("..");
    await noteContainer
      .locator('[contenteditable="true"]')
      .fill("test note content");
    await noteContainer.getByRole("button", { name: "Save" }).click();

    await expect(page.getByRole("status").first()).toContainText(
      /Note added successfully/,
    );
    await expect(page.getByText("test note content")).toBeVisible();
  });
});
