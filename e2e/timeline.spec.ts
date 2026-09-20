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
