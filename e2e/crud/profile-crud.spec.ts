import { test, expect, type Page } from "@playwright/test";
import { expectToast, selectOrCreateComboboxOption } from "../helpers";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  await expect(
    page.getByRole("heading", { name: "Resume" }),
  ).toBeVisible({ timeout: 10000 });
}

async function deleteResume(page: Page, title: string) {
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");
  const row = page
    .getByRole("row", { name: new RegExp(title, "i") })
    .first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.getByTestId("resume-actions-menu-btn").click({ force: true });
  await page
    .getByRole("menuitem", { name: "Delete" })
    .click({ force: true });
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete" })
    .click({ force: true });
  // Wait for the row to disappear from the table
  await expect(row).not.toBeVisible({ timeout: 10000 });
}

// ---------------------------------------------------------------------------
// Tests (8 total — each self-contained with unique uid and cleanup)
// ---------------------------------------------------------------------------

test("create resume and delete", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Create ${uid}`;

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await expectToast(page, /Resume title has been created/);
  await expect(page.locator("tbody")).toContainText(resumeTitle, {
    timeout: 10000,
  });

  await deleteResume(page, resumeTitle);
});

test("edit resume title", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Title ${uid}`;
  const editedTitle = `Resume Title ${uid} Edited`;

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await expect(page.locator("tbody")).toContainText(resumeTitle, {
    timeout: 10000,
  });

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
  await expect(page.locator("tbody")).toContainText(editedTitle, {
    timeout: 10000,
  });

  await deleteResume(page, editedTitle);
});

test("add contact info", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Contact ${uid}`;

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await openResumeEditor(page, resumeTitle);

  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Contact Info" }).click();
  await page.getByLabel("First Name").waitFor({ state: "visible" });
  await page.getByLabel("First Name").fill("John");
  await page.getByLabel("Last Name").fill("Doe");
  await page.getByLabel("Headline").fill("Skill developer with testing skills");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Phone").fill("123456789");
  await page.getByLabel("Address").fill("Calgary");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, /Contact Info has been created/);
  await expect(
    page.getByRole("heading", { name: "John Doe" }),
  ).toBeVisible();

  await deleteResume(page, resumeTitle);
});

test("add summary section", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Summary ${uid}`;

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await openResumeEditor(page, resumeTitle);

  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Summary" }).click();
  await page.getByLabel("Section Title").fill("Summary");
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill("this is test summary\n");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: "Summary" }),
  ).toBeVisible();
  await expect(page.getByText("this is test summary")).toBeVisible();
  await expectToast(page, /Summary has been created/);

  await deleteResume(page, resumeTitle);
});

test("add work experience", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Experience ${uid}`;
  const jobText = "Software Developer";

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await openResumeEditor(page, resumeTitle);

  // Add Experience section
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Experience" }).click();
  await page.waitForTimeout(500);

  const sectionTitleField = page.getByPlaceholder("Ex: Experience");
  if (await sectionTitleField.isVisible()) {
    await sectionTitleField.fill("Experience");
    await sectionTitleField.press("Tab");
  }

  await selectOrCreateComboboxOption(
    page,
    "Job Title",
    "Create or Search title",
    jobText,
  );
  await expect(page.getByLabel("Job Title")).toContainText(jobText);

  const companyText = "company test";
  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    companyText,
  );
  await expect(page.getByLabel("Company")).toContainText(companyText);

  const locationText = "location test";
  await selectOrCreateComboboxOption(
    page,
    "Job Location",
    "Create or Search location",
    locationText,
  );
  await expect(page.getByLabel("Job Location")).toContainText(locationText);

  await page.getByLabel("Start Date").click();
  await page.waitForTimeout(1000);
  const dateCell = page.getByRole("gridcell", { name: "15" }).first();
  await dateCell.waitFor({ state: "visible", timeout: 5000 });
  await dateCell.click();

  await page.locator("div:nth-child(2) > .tiptap").click();
  await page.locator("div:nth-child(2) > .tiptap").fill("test description");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, /Experience has been added/);
  await expect(
    page.getByRole("heading", { name: jobText }).first(),
  ).toBeVisible();

  await deleteResume(page, resumeTitle);
});

test("edit experience dialog opens and cancels", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume EditExp ${uid}`;
  const jobText = "Software Developer";

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await openResumeEditor(page, resumeTitle);

  // Add Experience section first
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Experience" }).click();
  await page.waitForTimeout(500);

  const sectionTitleField = page.getByPlaceholder("Ex: Experience");
  if (await sectionTitleField.isVisible()) {
    await sectionTitleField.fill("Experience");
    await sectionTitleField.press("Tab");
  }

  await selectOrCreateComboboxOption(
    page,
    "Job Title",
    "Create or Search title",
    jobText,
  );
  await expect(page.getByLabel("Job Title")).toContainText(jobText);

  const companyText = "company test";
  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    companyText,
  );
  await expect(page.getByLabel("Company")).toContainText(companyText);

  const locationText = "location test";
  await selectOrCreateComboboxOption(
    page,
    "Job Location",
    "Create or Search location",
    locationText,
  );
  await expect(page.getByLabel("Job Location")).toContainText(locationText);

  await page.getByLabel("Start Date").click();
  await page.waitForTimeout(1000);
  const dateCell = page.getByRole("gridcell", { name: "15" }).first();
  await dateCell.waitFor({ state: "visible", timeout: 5000 });
  await dateCell.click();

  await page.locator("div:nth-child(2) > .tiptap").click();
  await page.locator("div:nth-child(2) > .tiptap").fill("test description");
  await page.getByRole("button", { name: "Save" }).click();
  await expectToast(page, /Experience has been added/);
  await expect(
    page.getByRole("heading", { name: jobText }).first(),
  ).toBeVisible();

  // Click Edit on the experience entry — verify dialog opens then cancel
  await page
    .getByText(jobText + "Edit")
    .getByRole("button", { name: "Edit" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Edit Experience" }),
  ).toBeVisible();
  await page.getByText("Cancel").click();

  // Verify Add Experience dialog also opens and cancels
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Experience" }).click();
  await expect(
    page.getByRole("heading", { name: "Add Experience" }),
  ).toBeVisible();
  await page.getByText("Cancel").click();

  await deleteResume(page, resumeTitle);
});

test("multi-section integration: summary + experience + education", async ({
  page,
}) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume Full ${uid}`;
  const schoolName = "MIT";
  const degreeName = "Master of Science";
  const fieldOfStudy = "Computer Science";
  const jobTitle = "Senior Engineer";
  const companyName = "E2E Corp";
  const locationText = "Boston";
  const summaryText =
    "Experienced software engineer with deep expertise.";

  // Step 1: Create resume
  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await expect(page.locator("tbody")).toContainText(resumeTitle, {
    timeout: 10000,
  });

  // Step 2: Navigate into the resume editor
  await openResumeEditor(page, resumeTitle);

  // Step 3: Add Summary section
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Summary" }).click();
  await page.getByLabel("Section Title").fill("Professional Summary");
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(summaryText);
  await page.getByRole("button", { name: "Save" }).click();
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

  await selectOrCreateComboboxOption(
    page,
    "Job Title",
    "Create or Search title",
    jobTitle,
  );
  await expect(page.getByLabel("Job Title")).toContainText(jobTitle);

  await selectOrCreateComboboxOption(
    page,
    "Company",
    "Create or Search company",
    companyName,
  );
  await expect(page.getByLabel("Company")).toContainText(companyName);

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
  await page.locator(".tiptap").last().click();
  await page
    .locator(".tiptap")
    .last()
    .fill("Led engineering team on key projects.");
  await page.getByRole("button", { name: "Save" }).click();
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

  await selectOrCreateComboboxOption(
    page,
    "Location",
    "Create or Search location",
    locationText,
  );
  await expect(page.getByLabel("Location")).toContainText(locationText);

  await page.getByPlaceholder("Ex: Bachelor's").click();
  await page.getByPlaceholder("Ex: Bachelor's").fill(degreeName);

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
  const eduEndDateCell = page
    .getByRole("gridcell", { name: "20" })
    .first();
  await eduEndDateCell.waitFor({ state: "visible", timeout: 5000 });
  await eduEndDateCell.click();

  // Fill description
  await page.locator(".tiptap").last().click();
  await page.locator(".tiptap").last().fill("Graduated with honors.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: schoolName }).first(),
  ).toBeVisible({ timeout: 15000 });

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

  // Step 7: Clean up
  await deleteResume(page, resumeTitle);
});

test("add education and edit school name", async ({ page }) => {
  const uid = Date.now().toString(36);
  const resumeTitle = `Resume EditEdu ${uid}`;
  const originalSchool = "Harvard University";
  const updatedSchool = "Stanford University";

  await navigateToProfile(page);
  await createResume(page, resumeTitle);
  await expect(page.locator("tbody")).toContainText(resumeTitle, {
    timeout: 10000,
  });
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
  await page.getByRole("gridcell", { name: "15" }).first().click();

  // Set End Date
  await page.getByLabel("End Date").click();
  await page.waitForTimeout(1000);
  await page.getByRole("gridcell", { name: "20" }).first().click();

  // Fill description
  await page.locator(".tiptap").last().click();
  await page
    .locator(".tiptap")
    .last()
    .fill("Research in quantum computing.");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: originalSchool }).first(),
  ).toBeVisible({ timeout: 15000 });

  // Edit the education entry
  const educationCard = page
    .locator("div", { hasText: originalSchool })
    .filter({
      has: page.getByRole("button", { name: "Edit" }),
    })
    .first();
  await educationCard.getByRole("button", { name: "Edit" }).click();

  await expect(
    page.getByRole("heading", { name: "Edit Education" }),
  ).toBeVisible();

  // Change school name
  const schoolInput = page.getByPlaceholder("Ex: Stanford");
  await schoolInput.clear();
  await schoolInput.fill(updatedSchool);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: updatedSchool }).first(),
  ).toBeVisible({ timeout: 15000 });

  // Clean up
  await deleteResume(page, resumeTitle);
});
