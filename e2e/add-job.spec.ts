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
    await expect(
      page.getByLabel("Job Description").getByRole("paragraph"),
    ).toContainText("test description");
    await page.getByText("test description").click();
    await page
      .getByLabel("Job Description")
      .locator("div")
      .fill("test description edited");
    await page.getByTestId("save-job-btn").click();
    // Dialog closes only on a successful save; assert that instead of the
    // toast, which auto-dismisses and can vanish before the poll under load.
    await expect(page.getByTestId("add-job-dialog-title")).not.toBeVisible();
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

    await expect(page.getByText("test note content")).toBeVisible();
  });

  test("should show validation errors when required fields are missing", async ({
    page,
  }) => {
    // No cleanup needed: submission fails validation, so nothing is created.
    await page.getByRole("button", { name: "New Job" }).click();
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();

    await page.getByTestId("save-job-btn").click();

    await expect(page.getByText("Job title is required.")).toBeVisible();
    await expect(page.getByText("Company name is required.")).toBeVisible();
    await expect(page.getByText("Location is required.")).toBeVisible();
    await expect(page.getByText("Source is required.")).toBeVisible();
    await expect(
      page.getByText("Job description is required."),
    ).toBeVisible();
  });

  test("should change job status from the jobs table actions menu", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title status menu");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    // Radix submenus open on hover; clicking the subtrigger can toggle it
    // shut mid-open, so hover to open then wait for the item.
    await page.getByRole("menuitem", { name: "Change status" }).hover();
    const interviewItem = page.getByRole("menuitem", { name: "Interview" });
    await expect(interviewItem).toBeVisible();
    await interviewItem.click();

    // Assert on the persistent status cell rather than the toast, which
    // auto-dismisses after 5s and can vanish before the poll under load.
    await expect(
      page.getByRole("row", { name: jobText }).getByText("Interview"),
    ).toBeVisible();
  });

  test("should reuse an existing company when creating a second job", async ({
    page,
    cleanup,
  }) => {
    const firstJobText = uniqueName("developer test title reuse first");
    const secondJobText = uniqueName("developer test title reuse second");
    const sharedCompany = `company ${firstJobText.replace(/\s+/g, "-")}`;

    await createNewJob(page, firstJobText, cleanup);
    await expect(
      page.getByRole("row", { name: firstJobText }).first(),
    ).toBeVisible();

    await createNewJob(page, secondJobText, cleanup, {
      company: sharedCompany,
    });
    await expect(
      page.getByRole("row", { name: secondJobText }).first(),
    ).toBeVisible();

    await expect(
      page.getByRole("row", { name: firstJobText }).getByText(sharedCompany),
    ).toBeVisible();
    await expect(
      page.getByRole("row", { name: secondJobText }).getByText(sharedCompany),
    ).toBeVisible();
  });

  test("should find a job via the jobs search box", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title searchable");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    const searchInput = page.getByPlaceholder("Search jobs...");
    await searchInput.fill(jobText);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await searchInput.fill(uniqueName("no such job matches this"));
    await expect(page.getByRole("row", { name: jobText })).not.toBeVisible();
  });

  test("should filter the jobs list by status", async ({ page, cleanup }) => {
    const jobText = uniqueName("developer test title filter");
    await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page.getByTestId("job-filter-select").click();
    await page.getByRole("option", { name: "Rejected", exact: true }).click();
    await expect(page.getByRole("row", { name: jobText })).not.toBeVisible();

    await page.getByTestId("job-filter-select").click();
    await page.getByRole("option", { name: "Draft", exact: true }).click();
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();
  });

  test("should navigate to job details from the actions menu", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title view details");
    const jobId = await createNewJob(page, jobText, cleanup);
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "View Details" }).click();

    await expect(page).toHaveURL(new RegExp(`/dashboard/myjobs/${jobId}$`));
    await expect(page.getByText(jobText).first()).toBeVisible();
  });

  test("should add and persist a skill tag on a job", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("developer test title tag");
    const tagText = uniqueName("skill tag");
    cleanup.tag(tagText);

    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page
          .getByRole("combobox", { name: "Search or add a skill..." })
          .click();
        await page.getByPlaceholder("Type a skill...").fill(tagText);
        await page.getByText(`Create "${tagText}"`).click();
        // Wait for the create server action to resolve and the field to
        // update (the badge only renders once the tag id lands in form
        // state) before letting createNewJob click Save.
        await expect(page.getByText(tagText, { exact: true })).toBeVisible();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await page
      .getByRole("row", { name: jobText })
      .getByTestId("job-actions-menu-btn")
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Edit Job" }).click();
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await expect(page.getByText(tagText, { exact: true })).toBeVisible();
  });
});
