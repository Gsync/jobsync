import { addDays, format, startOfMonth, subMonths } from "date-fns";
import { test, expect, createNewJob, uniqueName } from "./fixtures";
import type { Page } from "@playwright/test";

// Opens the Add Stage dialog and picks a seeded type. The picker is a
// non-creatable ComboBox: filter first, then match the label exactly —
// "Offer" would otherwise also hit "Offer Accepted".
async function openStageDialogWith(page: Page, stageLabel: string) {
  await page.getByTestId("timeline-add-stage-btn").click();
  await page.getByTestId("stage-type-select").click();
  const search = page.getByPlaceholder("Search stage");
  await search.fill(stageLabel);
  await page.getByRole("option", { name: stageLabel, exact: true }).click();
  await expect(search).not.toBeVisible();
}

// DatePicker opens on this month, even when its selected date is earlier.
async function selectPastAppliedDate(page: Page, date: Date) {
  await page.getByLabel("Date Applied").click();
  await page.getByRole("button", { name: "Go to the Previous Month" }).click();
  await page.getByRole("button", { name: new RegExp(format(date, "PPPP")) }).click();
  await expect(page.getByLabel("Date Applied")).toHaveText(format(date, "PP"));
}

async function saveJob(page: Page) {
  await page.getByTestId("save-job-btn").click();
  await expect(page.getByTestId("add-job-dialog-title")).not.toBeVisible();
}

async function expectCurrentStage(
  page: Page,
  expected: { label: string; count: number; date?: Date },
) {
  await expect(page.getByRole("tab", { name: /^Timeline/ })).toHaveText(
    new RegExp(`^Timeline\\s*${expected.count}$`),
  );
  const current = page.locator('button[aria-current="step"]');
  await expect(current).toHaveCount(1);
  await expect(current).toContainText(expected.label);
  if (expected.date) {
    await expect(current).toContainText(format(expected.date, "MMM d"));
    await current.click();
    await expect(
      page.getByText(new RegExp(`${format(expected.date, "MMM d, yyyy")} ·`)),
    ).toBeVisible();
  }
}

test("adding an Offer stage moves the job's status on the Jobs list", async ({
  page,
  cleanup,
}) => {
  const jobTitle = uniqueName("Timeline Engineer");
  const jobId = await createNewJob(page, jobTitle, cleanup);

  await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
  await openStageDialogWith(page, "Offer");

  await expect(
    page.getByRole("checkbox", { name: /Set as current stage/ }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Add Stage", exact: true }).click();

  // The Stage History list reflects it without a reload.
  await expect(page.getByRole("button", { name: /^Offer/ }).first()).toBeVisible();
  await expect(page.getByRole("tab", { name: /Timeline/ })).toContainText("2");

  // ...and the derived status reached the Jobs list.
  await page.goto("/dashboard/myjobs");
  const row = page.getByRole("row", { name: jobTitle }).first();
  await expect(row).toBeVisible();
  await expect(row).toContainText("Offer");
});

test("linking an interviewer to a stage puts them on the job's Contacts tab", async ({
  page,
  cleanup,
}) => {
  const jobTitle = uniqueName("Timeline Interview");
  const contactName = uniqueName("Priya Tester");
  const jobId = await createNewJob(page, jobTitle, cleanup);

  await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);

  // An interview stage first: the stage-scoped menu items gate on stage kind.
  await openStageDialogWith(page, "Final / Onsite Interview");
  await page.getByRole("button", { name: "Add Stage", exact: true }).click();

  // Adding a stage does not move the selection, and the menu targets the
  // selected stage — so pick the new one before opening it.
  await page
    .getByRole("button", { name: /^Final \/ Onsite Interview/ })
    .first()
    .click();

  await page.getByTestId("update-status-menu-btn").click();
  await page.getByRole("menuitem", { name: "Add Interviewers" }).click();

  await page.getByPlaceholder("Full name").fill(contactName);
  cleanup.contact(contactName);
  await page.getByRole("button", { name: "Add Contact" }).click();
  await expect(
    page.getByLabel(new RegExp(`${contactName} is already linked`)),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Done/ }).click();

  // The job's Contacts tab is the single roster of everyone involved. Loaded
  // fresh: JobContactsTab seeds its rows from the server prop on mount.
  await page.goto(`/dashboard/myjobs/${jobId}?tab=contacts`);
  await expect(page.getByText(contactName)).toBeVisible();
  await expect(page.getByText("Interviewer")).toBeVisible();
});

test.describe("Job timeline sync", () => {
  test("adding an Applied job dates its first stage from Date Applied", async ({
    page,
    cleanup,
  }) => {
    const jobTitle = uniqueName("Backdated Applied job");
    const dateApplied = subMonths(startOfMonth(new Date()), 1);
    const jobId = await createNewJob(page, jobTitle, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("radio", { name: "Applied", exact: true }).click();
        await selectPastAppliedDate(page, dateApplied);
      },
    });

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await expectCurrentStage(page, { label: "Applied", count: 1, date: dateApplied });
    await page.getByTestId("job-details-edit-btn").click();
    await expect(page.getByRole("radio", { name: "Applied", exact: true })).toBeChecked();
    await expect(page.getByLabel("Date Applied")).toHaveText(format(dateApplied, "PP"));
  });

  test("editing Draft to Applied appends a stage dated from Date Applied", async ({
    page,
    cleanup,
  }) => {
    const jobTitle = uniqueName("Backdated Applied edit");
    const jobId = await createNewJob(page, jobTitle, cleanup);
    const dateApplied = subMonths(startOfMonth(new Date()), 1);

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await expectCurrentStage(page, { label: "Draft", count: 1 });
    await page.getByTestId("job-details-edit-btn").click();
    await page.getByRole("radio", { name: "Applied", exact: true }).click();
    await selectPastAppliedDate(page, dateApplied);
    await saveJob(page);

    await page.reload();
    await expectCurrentStage(page, { label: "Applied", count: 2, date: dateApplied });
    await expect(page.getByRole("button", { name: /^Draft/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Draft/ })).not.toHaveAttribute(
      "aria-current",
      "step",
    );
    await page.getByTestId("job-details-edit-btn").click();
    await expect(page.getByRole("radio", { name: "Applied", exact: true })).toBeChecked();
    await expect(page.getByLabel("Date Applied")).toHaveText(format(dateApplied, "PP"));
  });

  test("an unrelated edit preserves the specific current interview stage", async ({
    page,
    cleanup,
  }) => {
    const jobTitle = uniqueName("Interview stage unchanged");
    const jobId = await createNewJob(page, jobTitle, cleanup);

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await openStageDialogWith(page, "2nd Technical Interview");
    await page.getByRole("button", { name: "Add Stage", exact: true }).click();
    await expectCurrentStage(page, { label: "2nd Technical Interview", count: 2 });
    await page.locator('button[aria-current="step"]').click();
    const stageDate = await page.getByText(/ · \d{1,2}:\d{2} [AP]M/).innerText();

    await page.getByTestId("job-details-edit-btn").click();
    await expect(page.getByRole("radio", { name: "Interview", exact: true })).toBeChecked();
    await page.getByLabel("Job Description").locator("div").fill("An unrelated description edit");
    await saveJob(page);

    await page.reload();
    await expectCurrentStage(page, { label: "2nd Technical Interview", count: 2 });
    await expect(page.getByText(/ · \d{1,2}:\d{2} [AP]M/)).toHaveText(stageDate);
    await page.getByTestId("job-details-edit-btn").click();
    await expect(page.getByLabel("Job Description")).toContainText("An unrelated description edit");
  });

  test("changing only Date Applied leaves the existing stage date unchanged", async ({
    page,
    cleanup,
  }) => {
    const jobTitle = uniqueName("Applied date only edit");
    const originalDate = subMonths(startOfMonth(new Date()), 1);
    const changedDate = addDays(originalDate, 7);
    const jobId = await createNewJob(page, jobTitle, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("radio", { name: "Applied", exact: true }).click();
        await selectPastAppliedDate(page, originalDate);
      },
    });

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await expectCurrentStage(page, { label: "Applied", count: 1, date: originalDate });
    await page.getByTestId("job-details-edit-btn").click();
    await selectPastAppliedDate(page, changedDate);
    await saveJob(page);

    await page.reload();
    await expectCurrentStage(page, { label: "Applied", count: 1, date: originalDate });
    await page.getByTestId("job-details-edit-btn").click();
    await expect(page.getByRole("radio", { name: "Applied", exact: true })).toBeChecked();
    await expect(page.getByLabel("Date Applied")).toHaveText(format(changedDate, "PP"));
  });

  test("the table status menu appends one stage and disables the current status", async ({
    page,
    cleanup,
  }) => {
    const jobTitle = uniqueName("Table status timeline");
    const jobId = await createNewJob(page, jobTitle, cleanup);
    const row = page.getByRole("row", { name: jobTitle }).first();

    await row.getByTestId("job-actions-menu-btn").click();
    await page.getByRole("menuitem", { name: "Change status" }).hover();
    const interview = page.getByRole("menuitem", { name: "Interview", exact: true });
    await expect(interview).toBeVisible();
    await interview.click();
    await expect(row.getByText("Interview", { exact: true })).toBeVisible();

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await expectCurrentStage(page, { label: "Interview", count: 2 });
    await page.goto("/dashboard/myjobs");
    await row.getByTestId("job-actions-menu-btn").click();
    await page.getByRole("menuitem", { name: "Change status" }).hover();
    await expect(interview).toBeDisabled();
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
    await expectCurrentStage(page, { label: "Interview", count: 2 });
  });
});
