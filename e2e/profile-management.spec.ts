import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard");
});

async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

async function navigateToProfile(page: Page) {
  await page.getByRole("link", { name: "Profile" }).click();
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
  await page.getByRole("link", { name: "View/Edit Resume" }).click();
  await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
}

async function deleteResume(page: Page, title: string) {
  await page.getByRole("link", { name: "Profile" }).click();
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("row", { name: new RegExp(title, "i") }).first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.getByTestId("resume-actions-menu-btn").click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await expect(page.getByRole("alertdialog")).toContainText(
    /Are you sure you want to delete/,
  );
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
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
  await page.waitForTimeout(500);
  const existingOption = page.getByRole("option", { name: text, exact: true });
  const createOption = page.getByText(`Create: ${text}`);
  try {
    await existingOption.waitFor({ state: "visible", timeout: 3000 });
    await existingOption.click();
  } catch {
    await createOption.waitFor({ state: "visible", timeout: 3000 });
    await createOption.click();
  }
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
    await expect(page.getByRole("status").first()).toContainText(
      /Resume title has been created/,
    );
    await expect(page.locator("tbody")).toContainText(resumeTitle);

    // Step 2: Navigate into the resume editor
    await openResumeEditor(page, resumeTitle);

    // Step 3: Add Summary section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Summary" }).click();
    await page.getByLabel("Section Title").fill("Professional Summary");
    await page.locator(".tiptap").click();
    await page.locator(".tiptap").fill(summaryText);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Summary has been created/,
    );
    await expect(
      page.getByRole("heading", { name: "Professional Summary" }),
    ).toBeVisible();
    await expect(page.getByText(summaryText)).toBeVisible();

    // Step 4: Add Experience section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Experience" }).click();
    await page.waitForTimeout(500);

    // Fill section title (shown for first experience)
    const experienceSectionTitle = page.getByPlaceholder("Ex: Experience");
    if (await experienceSectionTitle.isVisible()) {
      await experienceSectionTitle.fill("Work Experience");
      await experienceSectionTitle.press("Tab");
    }

    // Fill Job Title combobox
    await selectOrCreateComboboxOption(
      page,
      "Job Title",
      "Create or Search title",
      jobTitle,
    );
    await expect(page.getByLabel("Job Title")).toContainText(jobTitle);

    // Fill Company combobox
    await selectOrCreateComboboxOption(
      page,
      "Company",
      "Create or Search company",
      companyName,
    );
    await expect(page.getByLabel("Company")).toContainText(companyName);

    // Fill Location combobox
    await selectOrCreateComboboxOption(
      page,
      "Job Location",
      "Create or Search location",
      locationText,
    );
    await expect(page.getByLabel("Job Location")).toContainText(locationText);

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    const expStartDateCell = page
      .getByRole("gridcell", { name: "10" })
      .first();
    await expStartDateCell.waitFor({ state: "visible", timeout: 5000 });
    await expStartDateCell.click();

    // Fill description
    await page.locator("div:nth-child(2) > .tiptap").click();
    await page
      .locator("div:nth-child(2) > .tiptap")
      .fill("Led engineering team on key projects.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Experience has been added/,
    );
    await expect(
      page.getByRole("heading", { name: jobTitle }).first(),
    ).toBeVisible();

    // Step 5: Add Education section
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Education" }).click();
    await page.waitForTimeout(500);

    // Fill section title (shown for first education)
    const educationSectionTitle = page.getByPlaceholder("Ex: Education");
    if (await educationSectionTitle.isVisible()) {
      await educationSectionTitle.fill("Education");
    }

    // Fill School
    await page.getByPlaceholder("Ex: Stanford").click();
    await page.getByPlaceholder("Ex: Stanford").fill(schoolName);

    // Fill Location
    await selectOrCreateComboboxOption(
      page,
      "Location",
      "Create or Search location",
      locationText,
    );
    await expect(page.getByLabel("Location")).toContainText(locationText);

    // Fill Degree
    await page.getByPlaceholder("Ex: Bachelor's").click();
    await page.getByPlaceholder("Ex: Bachelor's").fill(degreeName);

    // Fill Field of Study
    await page.getByPlaceholder("Ex: Computer Science").click();
    await page.getByPlaceholder("Ex: Computer Science").fill(fieldOfStudy);

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    const eduStartDateCell = page
      .getByRole("gridcell", { name: "15" })
      .first();
    await eduStartDateCell.waitFor({ state: "visible", timeout: 5000 });
    await eduStartDateCell.click();

    // Set End Date
    await page.getByLabel("End Date").click();
    await page.waitForTimeout(1000);
    const eduEndDateCell = page.getByRole("gridcell", { name: "20" }).first();
    await eduEndDateCell.waitFor({ state: "visible", timeout: 5000 });
    await eduEndDateCell.click();

    // Fill description
    await page.locator("div:nth-child(2) > .tiptap").click();
    await page
      .locator("div:nth-child(2) > .tiptap")
      .fill("Graduated with honors.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Education has been added/,
    );
    await expect(
      page.getByRole("heading", { name: schoolName }).first(),
    ).toBeVisible();

    // Step 6: Verify all sections are visible
    await expect(
      page.getByRole("heading", { name: "Professional Summary" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: jobTitle }).first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: schoolName }).first(),
    ).toBeVisible();

    // Step 7: Clean up - delete the resume
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should create and edit a resume title", async ({ page }) => {
    const resumeTitle = `E2E Resume Title ${Date.now()}`;
    const editedTitle = `${resumeTitle} Edited`;

    await navigateToProfile(page);
    await createResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume title has been created/,
    );

    // Edit the resume title
    const cells = page.getByText(new RegExp(resumeTitle, "i"));
    await expect(cells.first()).toBeVisible();
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
    await expect(page.getByRole("status").first()).toContainText(
      /Resume title has been updated/,
    );
    await expect(page.locator("tbody")).toContainText(editedTitle);

    // Clean up
    await deleteResume(page, editedTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should add education and edit the school name", async ({ page }) => {
    const resumeTitle = `E2E Edit Education ${Date.now()}`;
    const originalSchool = "Harvard University";
    const updatedSchool = "Stanford University";

    await navigateToProfile(page);
    await createResume(page, resumeTitle);
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
    await selectOrCreateComboboxOption(
      page,
      "Location",
      "Create or Search location",
      locationText,
    );

    await page.getByPlaceholder("Ex: Bachelor's").fill("PhD");
    await page.getByPlaceholder("Ex: Computer Science").fill("Physics");

    // Set Start Date
    await page.getByLabel("Start Date").click();
    await page.waitForTimeout(1000);
    await page
      .getByRole("gridcell", { name: "15" })
      .first()
      .click();

    // Set End Date
    await page.getByLabel("End Date").click();
    await page.waitForTimeout(1000);
    await page
      .getByRole("gridcell", { name: "20" })
      .first()
      .click();

    await page.locator("div:nth-child(2) > .tiptap").click();
    await page
      .locator("div:nth-child(2) > .tiptap")
      .fill("Research in quantum computing.");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Education has been added/,
    );
    await expect(
      page.getByRole("heading", { name: originalSchool }).first(),
    ).toBeVisible();

    // Edit the education entry
    await page
      .getByText(originalSchool + "Edit")
      .getByRole("button", { name: "Edit" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Education" }),
    ).toBeVisible();

    // Change school name
    const schoolInput = page.getByPlaceholder("Ex: Stanford");
    await schoolInput.clear();
    await schoolInput.fill(updatedSchool);
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Education has been updated/,
    );
    await expect(
      page.getByRole("heading", { name: updatedSchool }).first(),
    ).toBeVisible();

    // Clean up
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });
});
