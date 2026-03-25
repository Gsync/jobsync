import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard", { timeout: 30000 });
});

async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

async function navigateToProfile(page: Page) {
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");
}

async function createResume(page: Page, title: string) {
  await page.getByRole("button", { name: "New Resume" }).click();
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(title);
  await page.getByRole("button", { name: "Save" }).click();
}

async function openResumeEditor(page: Page, resumeTitle: string) {
  await page
    .getByRole("row", { name: new RegExp(resumeTitle, "i") })
    .first()
    .getByTestId("resume-actions-menu-btn")
    .click({ force: true });
  await Promise.all([
    page.waitForURL(/\/dashboard\/profile\/resume\//),
    page.getByRole("menuitem", { name: "View / Edit Resume" }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible({ timeout: 10000 });
}

async function deleteResume(page: Page, title: string) {
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("row", { name: new RegExp(title, "i") }).first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.getByTestId("resume-actions-menu-btn").click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click({ force: true });
  // Wait for the row to disappear from the table
  await expect(row).not.toBeVisible({ timeout: 10000 });
}

async function selectOrCreateComboboxOption(
  page: Page,
  label: string,
  searchPlaceholder: string,
  text: string,
) {
  await page.getByLabel(label).click();
  await page.getByPlaceholder(searchPlaceholder).click();
  await page.getByPlaceholder(searchPlaceholder).fill(text);
  await page.waitForTimeout(600); // Wait for debounce + filter
  // Try exact match first, then partial match, then create
  const exactOption = page.getByRole("option", { name: text, exact: true });
  const partialOption = page.getByRole("option", { name: new RegExp(text, "i") }).first();
  const createOption = page.getByText(`Create: ${text}`);
  try {
    await exactOption.waitFor({ state: "visible", timeout: 2000 });
    await exactOption.click();
  } catch {
    try {
      await partialOption.waitFor({ state: "visible", timeout: 2000 });
      await partialOption.click();
    } catch {
      await createOption.waitFor({ state: "visible", timeout: 3000 });
      await createOption.click();
    }
  }
  await page.waitForTimeout(300);
}

test.describe("Profile Management - Resume with Sections", () => {
  test("should create a resume, add sections, and delete", async ({
    page,
  }) => {
    const resumeTitle = `E2E Full Resume ${Date.now()}`;
    const schoolName = "MIT";
    const degreeName = "Master of Science";
    const fieldOfStudy = "Computer Science";
    const jobTitle = "Senior Engineer";
    const companyName = "E2E Corp";
    const locationText = "Boston";
    const summaryText = "Experienced software engineer with deep expertise.";

    // Step 1: Create resume
    await navigateToProfile(page);
    await createResume(page, resumeTitle);
    await expect(page.locator("tbody")).toContainText(resumeTitle, { timeout: 10000 });

    // Step 2: Navigate into the resume editor
    await openResumeEditor(page, resumeTitle);

    // Step 3: Add Summary section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Summary" }).click();
    await page.getByLabel("Section Title").fill("Professional Summary");
    await page.locator(".tiptap").click();
    await page.locator(".tiptap").fill(summaryText);
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for the dialog to close and the section to appear on the page
    await expect(
      page.getByRole("heading", { name: "Professional Summary" }),
    ).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(summaryText)).toBeVisible();

    // Step 4: Add Experience section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Experience" }).click();
    await page.waitForTimeout(500);

    const experienceSectionTitle = page.getByPlaceholder("Ex: Experience");
    if (await experienceSectionTitle.isVisible()) {
      await experienceSectionTitle.fill("Work Experience");
      await experienceSectionTitle.press("Tab");
    }

    await selectOrCreateComboboxOption(page, "Job Title", "Create or Search title", jobTitle);
    await expect(page.getByLabel("Job Title")).toContainText(jobTitle);

    await selectOrCreateComboboxOption(page, "Company", "Create or Search company", companyName);
    await expect(page.getByLabel("Company")).toContainText(companyName);

    await selectOrCreateComboboxOption(page, "Job Location", "Create or Search location", locationText);
    await expect(page.getByLabel("Job Location")).toContainText(locationText);

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    const expStartDateCell = page.getByRole("gridcell", { name: "10" }).first();
    await expStartDateCell.waitFor({ state: "visible", timeout: 5000 });
    await expStartDateCell.click();

    // Fill description
    await page.locator(".tiptap").last().click();
    await page.locator(".tiptap").last().fill("Led engineering team on key projects.");
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for the experience heading to appear on the page
    await expect(
      page.getByRole("heading", { name: jobTitle }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Step 5: Add Education section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Education" }).click();
    await page.waitForTimeout(500);

    const educationSectionTitle = page.getByPlaceholder("Ex: Education");
    if (await educationSectionTitle.isVisible()) {
      await educationSectionTitle.fill("Education");
    }

    await page.getByPlaceholder("Ex: Stanford").click();
    await page.getByPlaceholder("Ex: Stanford").fill(schoolName);

    await selectOrCreateComboboxOption(page, "Location", "Create or Search location", locationText);
    await expect(page.getByLabel("Location")).toContainText(locationText);

    await page.getByPlaceholder("Ex: Bachelor's").click();
    await page.getByPlaceholder("Ex: Bachelor's").fill(degreeName);

    await page.getByPlaceholder("Ex: Computer Science").click();
    await page.getByPlaceholder("Ex: Computer Science").fill(fieldOfStudy);

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    const eduStartDateCell = page.getByRole("gridcell", { name: "15" }).first();
    await eduStartDateCell.waitFor({ state: "visible", timeout: 5000 });
    await eduStartDateCell.click();

    // Set End Date
    await page.getByLabel("End Date").click();
    await page.waitForTimeout(1000);
    const eduEndDateCell = page.getByRole("gridcell", { name: "20" }).first();
    await eduEndDateCell.waitFor({ state: "visible", timeout: 5000 });
    await eduEndDateCell.click();

    // Fill description
    await page.locator(".tiptap").last().click();
    await page.locator(".tiptap").last().fill("Graduated with honors.");
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for the education heading to appear on the page
    await expect(
      page.getByRole("heading", { name: schoolName }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Step 6: Verify all sections are visible
    await expect(page.getByRole("heading", { name: "Professional Summary" })).toBeVisible();
    await expect(page.getByRole("heading", { name: jobTitle }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: schoolName }).first()).toBeVisible();

    // Step 7: Clean up - delete the resume
    await deleteResume(page, resumeTitle);
  });

  test("should create and edit a resume title", async ({ page }) => {
    const resumeTitle = `E2E Resume Title ${Date.now()}`;
    const editedTitle = `${resumeTitle} Edited`;

    await navigateToProfile(page);
    await createResume(page, resumeTitle);
    await expect(page.locator("tbody")).toContainText(resumeTitle, { timeout: 10000 });

    // Edit the resume title
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .getByTestId("resume-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: /Edit Resume Title/ }).click();
    await page.getByPlaceholder("Ex: Full Stack Developer").fill(editedTitle);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Save" })
      .click();
    // Verify the edited title appears in the table
    await expect(page.locator("tbody")).toContainText(editedTitle, { timeout: 10000 });

    // Clean up
    await deleteResume(page, editedTitle);
  });

  test("should add education and edit the school name", async ({ page }) => {
    const resumeTitle = `E2E Edit Education ${Date.now()}`;
    const originalSchool = "Harvard University";
    const updatedSchool = "Stanford University";

    await navigateToProfile(page);
    await createResume(page, resumeTitle);
    await expect(page.locator("tbody")).toContainText(resumeTitle, { timeout: 10000 });
    await openResumeEditor(page, resumeTitle);

    // Add Education section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Education" }).click();
    await page.waitForTimeout(500);

    const sectionTitleField = page.getByPlaceholder("Ex: Education");
    if (await sectionTitleField.isVisible()) {
      await sectionTitleField.fill("Education");
    }

    await page.getByPlaceholder("Ex: Stanford").fill(originalSchool);

    const locationText = "Cambridge";
    await selectOrCreateComboboxOption(page, "Location", "Create or Search location", locationText);

    await page.getByPlaceholder("Ex: Bachelor's").fill("PhD");
    await page.getByPlaceholder("Ex: Computer Science").fill("Physics");

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    await page.getByRole("gridcell", { name: "15" }).first().click();

    // Set End Date
    await page.getByLabel("End Date").click();
    await page.waitForTimeout(1000);
    await page.getByRole("gridcell", { name: "20" }).first().click();

    // Fill description
    await page.locator(".tiptap").last().click();
    await page.locator(".tiptap").last().fill("Research in quantum computing.");
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for the education heading to appear on the page
    await expect(
      page.getByRole("heading", { name: originalSchool }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Edit the education entry
    const educationCard = page.locator("div", { hasText: originalSchool }).filter({
      has: page.getByRole("button", { name: "Edit" }),
    }).first();
    await educationCard.getByRole("button", { name: "Edit" }).click();

    await expect(
      page.getByRole("heading", { name: "Edit Education" }),
    ).toBeVisible();

    // Change school name
    const schoolInput = page.getByPlaceholder("Ex: Stanford");
    await schoolInput.clear();
    await schoolInput.fill(updatedSchool);
    await page.getByRole("button", { name: "Save" }).click();
    // Wait for the updated heading to appear
    await expect(
      page.getByRole("heading", { name: updatedSchool }).first(),
    ).toBeVisible({ timeout: 15000 });

    // Clean up
    await deleteResume(page, resumeTitle);
  });
});
