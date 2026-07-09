import { type Page } from "@playwright/test";
import {
  test,
  expect,
  selectOrCreate,
  uniqueName,
  type CleanupRegistry,
} from "./fixtures";

async function createResume(
  page: Page,
  title: string,
  cleanup: CleanupRegistry,
) {
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("menuitem", { name: "Add New Resume" }).click();
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(title);
  await page.getByRole("button", { name: "Save" }).click();
  cleanup.resume(title);
}

test.describe("Profile page", () => {
  test("should create a new resume", async ({ page, cleanup }) => {
    const resumeTitle = uniqueName("Test Resume");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await expect(page.locator("tbody")).toContainText(resumeTitle);
    await deleteResume(page, resumeTitle);
    // Assert on the persistent outcome (row removed) rather than the toast,
    // which auto-dismisses after 5s and can vanish before the poll under load.
    await expect(page.locator("tbody")).not.toContainText(resumeTitle);
  });

  test("should edit the resume title", async ({ page, baseURL, cleanup }) => {
    const resumeTitle = uniqueName("Test Resume");
    const editedTitle = uniqueName("Test Resume edited");
    // Register the edited title too, since it's what the row becomes on success.
    cleanup.resume(editedTitle);
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(baseURL + "/dashboard/profile");
    await createResume(page, resumeTitle, cleanup);

    const cells = page.getByText(new RegExp(resumeTitle, "i"));
    await expect(cells.first()).toBeVisible();
    await page
      .getByRole("row", { name: resumeTitle })
      .getByTestId("document-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: /Edit Resume Title/ }).click();
    await page.getByPlaceholder("Ex: Full Stack Developer").fill(editedTitle);
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(page.locator("tbody")).toContainText(editedTitle);
  });

  test("should add resume contact info", async ({ page, cleanup }) => {
    const resumeTitle = uniqueName("Test Resume");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("document-actions-menu-btn")
      .click();
    await page.getByRole("link", { name: "View/Edit Resume" }).click();
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
    await expect(page.getByRole("heading", { name: "John Doe" })).toBeVisible();
  });

  test("should add resume summary section", async ({ page, cleanup }) => {
    const resumeTitle = uniqueName("Test Resume");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("document-actions-menu-btn")
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
  });

  test("should add resume work experience section", async ({
    page,
    cleanup,
  }) => {
    const resumeTitle = uniqueName("Test Resume");
    const jobText = uniqueName("Software Developer");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await addExperience(page, resumeTitle, jobText, cleanup);
    await expect(
      page.getByRole("heading", { name: jobText }).first(),
    ).toBeVisible();
  });

  test("should add resume work experience after clicking Edit Experience section", async ({
    page,
    cleanup,
  }) => {
    const resumeTitle = uniqueName("Test Resume");
    const jobText = uniqueName("Software Developer");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await addExperience(page, resumeTitle, jobText, cleanup);
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
  });

  test("should add resume education section", async ({ page, cleanup }) => {
    const resumeTitle = uniqueName("Test Resume");
    const locationText = uniqueName("location test");
    await page.getByRole("link", { name: "Profile" }).click();
    await createResume(page, resumeTitle, cleanup);
    await page
      .getByRole("row", { name: new RegExp(resumeTitle, "i") })
      .first()
      .getByTestId("document-actions-menu-btn")
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
    await selectOrCreate(
      page,
      "Location",
      "Create or Search location",
      locationText,
    );
    cleanup.location(locationText);
    await page.getByPlaceholder("Ex: Bachelor's").click();
    await page.getByPlaceholder("Ex: Bachelor's").fill("degree text");
    await page.getByPlaceholder("Ex: Computer Science").click();
    await page.getByPlaceholder("Ex: Computer Science").fill("computer science");
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
    await expect(
      page.getByRole("heading", { name: "test school" }).first(),
    ).toBeVisible();
  });
});

async function addExperience(
  page: Page,
  resumeTitle: string,
  jobText: string,
  cleanup: CleanupRegistry,
) {
  const companyText = uniqueName("company test");
  const locationText = uniqueName("location test");
  await page
    .getByRole("row", { name: new RegExp(resumeTitle, "i") })
    .first()
    .getByTestId("document-actions-menu-btn")
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
  await selectOrCreate(page, "Job Title", "Create or Search title", jobText);
  cleanup.title(jobText);
  await selectOrCreate(page, "Company", "Create or Search company", companyText);
  cleanup.company(companyText);
  await selectOrCreate(
    page,
    "Job Location",
    "Create or Search location",
    locationText,
  );
  cleanup.location(locationText);
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
  await row.getByTestId("document-actions-menu-btn").click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await expect(page.getByRole("alertdialog")).toContainText(
    "Are you sure you want to delete this resume?",
  );
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
}
