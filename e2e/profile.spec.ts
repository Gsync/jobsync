import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page).toHaveURL(baseURL + "/dashboard");
});

async function createResume(page: Page, title: string) {
  await page.getByRole("button", { name: "Create Resume" }).click();
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(title);
  await page.getByRole("button", { name: "Save" }).click();
}

test.describe("Profile page", () => {
  const editedTitle = "Test Resume 2 edited";
  test("should create a new resume", async ({ page }) => {
    const resumeTitle = "Test Resume 1";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume title has been created/,
    );
    await expect(page.locator("tbody")).toContainText(resumeTitle);
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should edit the resume title", async ({ page, baseURL }) => {
    const resumeTitle = "Test Resume 2";
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(baseURL + "/dashboard/profile");
    await createResume(page, resumeTitle);

    const cells = page.getByText(new RegExp(resumeTitle, "i"));
    await expect(cells.first()).toBeVisible();
    await page
      .getByRole("row", { name: resumeTitle })
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
    await deleteResume(page, editedTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });
  test("should add resume contact info", async ({ page }) => {
    const resumeTitle = `Test Resume 3 ${Date.now()}`;
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("resume-actions-menu-btn")
      .click();
    await page.getByRole("link", { name: "View/Edit Resume" }).click();
    // await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Contact Info" }).click();
    await page.getByLabel("First Name").waitFor({ state: "visible" });
    await page.getByLabel("First Name").click();
    await page.getByLabel("First Name").fill("John");
    await page.getByLabel("Last Name").click();
    await page.getByLabel("Last Name").fill("Doe");
    await page.getByLabel("Headline").click();
    await page
      .getByLabel("Headline")
      .fill("Skill developer with testing skills");
    await page.getByLabel("Email").click();
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Phone").click();
    await page.getByLabel("Phone").fill("123456789");
    await page.getByLabel("Address").click();
    await page.getByLabel("Address").fill("Calgary");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Contact Info has been created/,
    );
    await expect(page.getByRole("heading", { name: "John Doe" })).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should add resume summary section", async ({ page }) => {
    const resumeTitle = `Test Resume 4 ${Date.now()}`;
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("resume-actions-menu-btn")
      .click();
    await page.getByRole("link", { name: "View/Edit Resume" }).click();
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Summary" }).click();
    await page.getByLabel("Section Title").fill("Summary");
    await page.locator(".tiptap").click();
    await page.locator(".tiptap").fill("this is test summary\n");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("heading", { name: "Summary" })).toBeVisible();
    await expect(page.getByText("this is test summary")).toBeVisible();
    await expect(page.getByRole("status").first()).toContainText(
      /Summary has been created/,
    );
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should add resume work experience section", async ({ page }) => {
    const resumeTitle = `Test Resume 5 ${Date.now()}`;
    const jobText = "Software Developer";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await addExperience(page, resumeTitle, jobText);
    await expect(page.getByRole("status").first()).toContainText(
      /Experience has been added/,
    );
    await expect(
      page.getByRole("heading", { name: jobText }).first(),
    ).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should add resume work experience after clicking Edit Experience section", async ({
    page,
  }) => {
    const resumeTitle = `Test Resume 6 ${Date.now()}`;
    const jobText = "Software Developer";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await addExperience(page, resumeTitle, jobText);
    await expect(page.getByRole("status").first()).toContainText(
      /Experience has been added/,
    );
    await expect(
      page.getByRole("heading", { name: jobText }).first(),
    ).toBeVisible();
    await page
      .getByText(jobText + "Edit")
      .getByRole("button", { name: "Edit" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Experience" }),
    ).toBeVisible();
    await page.getByText("Cancel").click();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Experience" }).click();
    await expect(
      page.getByRole("heading", { name: "Add Experience" }),
    ).toBeVisible();
    await page.getByText("Cancel").click();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });

  test("should add resume education section", async ({ page }) => {
    const resumeTitle = `Test Resume 7 ${Date.now()}`;
    const degreeText = "Bachelor of Science";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("resume-actions-menu-btn")
      .click({ force: true });
    await page.getByRole("link", { name: "View/Edit Resume" }).click();
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Education" }).click();
    // Wait for the dialog to open
    await page.waitForTimeout(500);
    // Only fill section title if it's visible (when creating new section)
    const sectionTitleField = page.getByPlaceholder("Ex: Education");
    if (await sectionTitleField.isVisible()) {
      await sectionTitleField.fill("Education");
    }
    await page.getByPlaceholder("Ex: Stanford").click();
    await page.getByPlaceholder("Ex: Stanford").fill("test school");
    await page.getByLabel("Location").click();
    await page.getByPlaceholder("Create or Search location").click();
    const locationText = "location test";
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
    await expect(page.getByLabel("Location")).toContainText(locationText);
    await page.getByPlaceholder("Ex: Bachelor's").click();
    await page.getByPlaceholder("Ex: Bachelor's").fill("degree text");
    await page.getByPlaceholder("Ex: Computer Science").click();
    await page
      .getByPlaceholder("Ex: Computer Science")
      .fill("computer science");
    await page.getByLabel("Start Date").click();
    // Wait for calendar popover to open
    await page.waitForTimeout(1000);
    // Click on any available date in the calendar
    const startDateCell = page.getByRole("gridcell", { name: "15" }).first();
    await startDateCell.waitFor({ state: "visible", timeout: 5000 });
    await startDateCell.click();
    await page.getByLabel("End Date").click();
    // Wait for calendar popover to open
    await page.waitForTimeout(1000);
    // Click on any available date in the calendar
    const endDateCell = page.getByRole("gridcell", { name: "20" }).first();
    await endDateCell.waitFor({ state: "visible", timeout: 5000 });
    await endDateCell.click();
    await page.locator("div:nth-child(2) > .tiptap").click();
    await page.locator("div:nth-child(2) > .tiptap").fill("test description");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Education has been added/,
    );
    await expect(
      page.getByRole("heading", { name: "test school" }).first(),
    ).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/,
    );
  });
});

async function addExperience(page: Page, resumeTitle: string, jobText: string) {
  await page
    .getByRole("row", { name: new RegExp(resumeTitle, "i") })
    .first()
    .getByTestId("resume-actions-menu-btn")
    .click();
  await page.getByRole("link", { name: "View/Edit Resume" }).click();
  await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Experience" }).click();
  // Wait for the dialog to open
  await page.waitForTimeout(500);
  // Only fill section title if it's visible (when creating new section)
  const sectionTitleField = page.getByPlaceholder("Ex: Experience");
  if (await sectionTitleField.isVisible()) {
    await sectionTitleField.fill("Experience");
    await sectionTitleField.press("Tab");
  }
  await page.getByLabel("Job Title").click();
  await page.getByPlaceholder("Create or Search title").click();
  await page.getByPlaceholder("Create or Search title").fill(jobText);
  await page.waitForTimeout(500); // Wait for debounce
  // Check if item exists in list or needs to be created
  const existingTitle = page.getByRole("option", {
    name: jobText,
    exact: true,
  });
  const createTitle = page.getByText(`Create: ${jobText}`);
  if (await existingTitle.isVisible()) {
    await existingTitle.click();
  } else if (await createTitle.isVisible()) {
    await createTitle.click();
  }
  await expect(page.getByLabel("Job Title")).toContainText(jobText);
  await page.getByLabel("Company").click();
  await page.getByPlaceholder("Create or Search company").click();
  const companyText = "company test";
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
  const locationText = "location test";
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
  await page.getByLabel("Start Date").click();
  // Wait for calendar popover to open
  await page.waitForTimeout(1000);
  // Click on any available date in the calendar
  const dateCell = page.getByRole("gridcell", { name: "15" }).first();
  await dateCell.waitFor({ state: "visible", timeout: 5000 });
  await dateCell.click();
  await page.locator("div:nth-child(2) > .tiptap").click();
  await page.locator("div:nth-child(2) > .tiptap").fill("test description");
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteResume(page: Page, title: string) {
  await page.getByRole("link", { name: "Profile" }).click();
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("row", { name: new RegExp(title, "i") }).first();
  await row.waitFor({ state: "visible", timeout: 10000 });
  await row.getByTestId("resume-actions-menu-btn").click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await expect(page.getByRole("alertdialog")).toContainText(
    "Are you sure you want to delete this resume?",
  );
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
}
