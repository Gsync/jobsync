import { addDays, format } from "date-fns";
import { test, expect, createNewJob, uniqueName } from "./fixtures";

test.describe("Add New Job", () => {
  test("should allow me to add a new job", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer test title");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();
  });

  test("should edit the job created", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer test title");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByText(jobText).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(
      page.getByPlaceholder("Copy and paste job link here"),
    ).toHaveValue("www.google.com");
    await expect(page.getByLabel("Job Title")).toContainText(jobText);
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

  test("should delete a job", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer test title delete");
    // Registered as a safety net; the test deletes the job via the UI below
    // and the cleanup API is idempotent if the row is already gone.
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

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

  test("should save a job without a job url", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer test title no url");
    await createNewJob(page, jobText, cleanup, { skipUrl: true });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

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
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title applied");
    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("switch").click();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByRole("switch")).toBeChecked();
    await expect(page.getByLabel("Select Job Status")).toContainText("Applied");
    await expect(page.getByLabel("Date Applied")).toContainText(
      format(new Date(), "PP"),
    );
  });

  test("should persist selected salary range after saving", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title salary");
    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page.getByLabel("Select Salary Range").click();
        await page
          .getByRole("option", { name: "40,000 - 50,000", exact: true })
          .click();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

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

  test("should persist selected workplace type after saving", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title workplace");
    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("radio", { name: "Remote" }).click();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByRole("radio", { name: "Remote" })).toBeChecked();
  });

  test("should persist selected due date after saving", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title due date");
    const expectedDueDate = format(addDays(new Date(), 7), "PP");
    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page.getByLabel("Due Date").click();
        await page.getByText("Select Preset").click();
        await page.getByRole("option", { name: "In a week" }).click();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

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
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title note");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

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
