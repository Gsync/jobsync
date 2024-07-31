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
      /Resume title has been created/
    );
    await expect(page.locator("tbody")).toContainText(resumeTitle);
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
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
      /Resume title has been updated/
    );
    await expect(page.locator("tbody")).toContainText(editedTitle);
    await deleteResume(page, editedTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
    );
  });
  test("should add resume contact info", async ({ page }) => {
    const resumeTitle = "Test Resume 3";
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
    await page.getByLabel("First Name").fill("John");
    await page.getByLabel("First Name").press("Tab");
    await page.getByLabel("Last Name").fill("Doe");
    await page.getByLabel("Last Name").press("Tab");
    await page
      .getByLabel("Headline")
      .fill("Skill developer with testing skills");
    await page.getByLabel("Headline").press("Tab");
    await page.getByLabel("Email").fill("admin@example.com");
    await page.getByLabel("Email").press("Tab");
    await page.getByLabel("Phone").fill("123456789");
    await page.getByLabel("Phone").press("Tab");
    await page.getByLabel("Address").fill("Calgary");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Contact Info has been created/
    );
    await expect(page.getByRole("heading", { name: "John Doe" })).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
    );
  });

  test("should add resume summary section", async ({ page }) => {
    const resumeTitle = "Test Resume 4";
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
      /Summary has been created/
    );
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
    );
  });

  test("should add resume work experience section", async ({ page }) => {
    const resumeTitle = "Test Resume 5";
    const jobText = "Software Developer";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await addExperience(page, resumeTitle, jobText);
    await expect(page.getByRole("status").first()).toContainText(
      /Experience has been added/
    );
    await expect(page.getByRole("heading", { name: jobText })).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
    );
  });

  test("should add resume work experience after clicking Edit Experience section", async ({
    page,
  }) => {
    const resumeTitle = "Test Resume 6";
    const jobText = "Software Developer";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await addExperience(page, resumeTitle, jobText);
    await expect(page.getByRole("status").first()).toContainText(
      /Experience has been added/
    );
    await expect(page.getByRole("heading", { name: jobText })).toBeVisible();
    await page
      .getByText(jobText + "Edit")
      .getByRole("button", { name: "Edit" })
      .click();
    await expect(
      page.getByRole("heading", { name: "Edit Experience" })
    ).toBeVisible();
    await page.getByText("Cancel").click();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Experience" }).click();
    await expect(
      page.getByRole("heading", { name: "Add Experience" })
    ).toBeVisible();
    await page.getByText("Cancel").click();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
    );
  });

  test("should add resume education section", async ({ page }) => {
    const resumeTitle = "Test Resume 7";
    const degreeText = "Bachelor of Science";
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle);
    await page.getByTestId("resume-actions-menu-btn").first().click();
    await page.getByRole("link", { name: "View/Edit Resume" }).click();
    await expect(page.getByRole("heading", { name: "Resume" })).toBeVisible();
    await page.getByRole("button", { name: "Add Section" }).click();
    await page.getByRole("menuitem", { name: "Add Education" }).click();
    await page.getByPlaceholder("Ex: Education").fill("Education");
    await page.getByPlaceholder("Ex: Stanford").click();
    await page.getByPlaceholder("Ex: Stanford").fill("test school");
    await page.getByLabel("Location").click();
    await page.getByPlaceholder("Create or Search location").click();
    const locationText = "location test";
    await page.getByPlaceholder("Create or Search location").fill(locationText);
    const locationTitle = page.getByRole("option", {
      name: locationText,
      exact: true,
    });
    if (await locationTitle.isVisible()) {
      await locationTitle.click();
    } else {
      await page.getByText(locationText).click();
    }
    await expect(page.getByLabel("Location")).toContainText(locationText);
    await page.getByPlaceholder("Ex: Bachelor's").click();
    await page.getByPlaceholder("Ex: Bachelor's").fill("degree text");
    await page.getByPlaceholder("Ex: Computer Science").click();
    await page
      .getByPlaceholder("Ex: Computer Science")
      .fill("computer science");
    await page.getByLabel("Start Date").click();
    await page
      .getByRole("gridcell", { name: "2", exact: true })
      .first()
      .click();
    await page.getByLabel("End Date").click();
    await page
      .getByRole("gridcell", { name: "3", exact: true })
      .first()
      .click();
    await page.locator("div:nth-child(2) > .tiptap").click();
    await page.locator("div:nth-child(2) > .tiptap").fill("test description");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("status").first()).toContainText(
      /Education has been added/
    );
    await expect(
      page.getByRole("heading", { name: "test school" })
    ).toBeVisible();
    await deleteResume(page, resumeTitle);
    await expect(page.getByRole("status").first()).toContainText(
      /Resume has been deleted successfully/
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
  await page.getByPlaceholder("Ex: Experience").fill("Experience");
  await page.getByPlaceholder("Ex: Experience").press("Tab");
  await page.getByLabel("Job Title").click();
  await page.getByPlaceholder("Create or Search title").click();
  await page.getByPlaceholder("Create or Search title").fill(jobText);
  const jobTitle = page.getByRole("option", {
    name: jobText,
    exact: true,
  });
  if (await jobTitle.isVisible()) {
    await jobTitle.click();
  } else {
    await page.getByText(jobText).click();
  }
  await expect(page.getByLabel("Job Title")).toContainText(jobText);
  await page.getByLabel("Company").click();
  await page.getByPlaceholder("Create or Search company").click();
  const companyText = "company test";
  await page.getByPlaceholder("Create or Search company").fill(companyText);
  const companyTitle = page.getByRole("option", {
    name: companyText,
    exact: true,
  });
  if (await companyTitle.isVisible()) {
    await companyTitle.click();
  } else {
    await page.getByText(companyText).click();
  }
  await expect(page.getByLabel("Company")).toContainText(companyText);
  await page.getByLabel("Job Location").click();
  await page.getByPlaceholder("Create or Search location").click();
  const locationText = "location test";
  await page.getByPlaceholder("Create or Search location").fill(locationText);
  const locationTitle = page.getByRole("option", {
    name: locationText,
    exact: true,
  });
  if (await locationTitle.isVisible()) {
    await locationTitle.click();
  } else {
    await page.getByText(locationText).click();
  }
  await expect(page.getByLabel("Job Location")).toContainText(locationText);
  await page.getByLabel("Start Date").click();
  await page.getByRole("gridcell", { name: "2", exact: true }).first().click();
  await page.locator("div:nth-child(2) > .tiptap").click();
  await page.locator("div:nth-child(2) > .tiptap").fill("test description");
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteResume(page: Page, title: string) {
  await page.getByRole("link", { name: "Profile" }).click();
  await page
    .getByRole("row", { name: title })
    .first()
    .getByTestId("resume-actions-menu-btn")
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByRole("alertdialog")).toContainText(
    "Are you sure you want to delete this resume?"
  );
  await page.getByRole("button", { name: "Delete" }).click();
}
