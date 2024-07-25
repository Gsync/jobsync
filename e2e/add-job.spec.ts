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

async function createNewJob(page: Page, jobText: string) {
  await page.getByRole("button", { name: "Add New Job" }).click();
  await expect(page).toHaveURL("/dashboard/myjobs");

  await page.getByTestId("add-job-btn").click();
  await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
  await page
    .getByPlaceholder("Copy and paste job link here")
    .fill("www.google.com");
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
    await page.getByText(jobText, { exact: true }).click();
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
  await page.getByText("Part-time").click();
  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");
  await page.getByLabel("Job Description").locator("div").click();
  await page
    .getByLabel("Job Description")
    .locator("div")
    .fill("test description");
  await page.getByTestId("save-job-btn").click();
}

async function deleteJob(page: Page, jobText: string) {
  await page.goto("localhost:3000/dashboard/myjobs");
  const cells = page.getByText(new RegExp(jobText, "i"));
  await expect(cells.first()).toBeVisible();
  await page
    .getByRole("row", { name: jobText })
    .getByTestId("job-actions-menu-btn")
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await page.getByRole("button", { name: "Delete" }).click();
  // await expect(page.getByRole("status").first()).toContainText(
  //   /Job has been deleted/
  // );
}

test.describe("Add New Job", () => {
  const jobText = "developer test title 1";

  test("should allow me to add a new job", async ({ page }) => {
    await createNewJob(page, jobText);
    await expect(
      page.getByRole("row", { name: jobText }).first()
    ).toBeVisible();
    await deleteJob(page, jobText);
  });

  test("should edit the job created", async ({ page }) => {
    const jobText = "developer test title 2";
    await createNewJob(page, jobText);
    const cell = page.getByText(jobText).first();
    await expect(cell).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(
      page.getByPlaceholder("Copy and paste job link here")
    ).toHaveValue("www.google.com");
    await expect(page.getByLabel("Job Title")).toContainText(
      "developer test title"
    );
    await expect(page.getByLabel("Company")).toContainText("company test");
    await expect(page.getByLabel("Job Location")).toContainText(
      "location test"
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
      /Job has been updated/
    );
    await deleteJob(page, jobText);
  });
});
