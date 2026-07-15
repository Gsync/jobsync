import { type Page } from "@playwright/test";
import {
  test,
  expect,
  uniqueName,
  selectOrCreate,
  type CleanupRegistry,
} from "./fixtures";

async function navigateToActivities(page: Page) {
  await page.goto("/dashboard/activities");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-activity-btn").waitFor({ state: "visible" });
}

// Stops any activity left running by a previous test so start/stop assertions
// begin from a clean state (mirrors the tasks-activity integration guard).
async function stopRunningActivity(page: Page) {
  const stopButton = page.getByRole("button", { name: "Stop" });
  if (await stopButton.isVisible().catch(() => false)) {
    await stopButton.click({ force: true });
    await expect(stopButton).not.toBeVisible({ timeout: 10000 });
  }
}

// Opens the New Activity dialog and saves an activity with the given name. The
// form pre-fills valid start/end times (now .. now+5m), so only the name and
// activity type need filling. Registers both the activity and its Library type
// for teardown the moment they persist.
async function createActivity(
  page: Page,
  activityName: string,
  activityType: string,
  cleanup: CleanupRegistry,
) {
  await page.getByTestId("add-activity-btn").click();
  await expect(page.getByText("Add New Activity")).toBeVisible();

  await page
    .getByPlaceholder("Ex: Job Search, Learning skill, etc")
    .fill(activityName);

  await selectOrCreate(
    page,
    "Activity Type",
    "Create or Search activityType",
    activityType,
  );
  cleanup.activityType(activityType);

  await page.getByTestId("save-activity-btn").click();
  await expect(page.getByText("Add New Activity")).not.toBeVisible({
    timeout: 10000,
  });
  cleanup.activity(activityName);
}

test.describe.serial("Activities Management", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToActivities(page);
    await stopRunningActivity(page);
  });

  test("should create a new activity", async ({ page, cleanup }) => {
    const activityName = uniqueName("E2E Activity");
    const activityType = uniqueName("E2E Activity Type");
    await createActivity(page, activityName, activityType, cleanup);

    await expect(
      page.getByRole("row", { name: new RegExp(activityName, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should search activities by name", async ({ page, cleanup }) => {
    const activityName = uniqueName("E2E Search Activity");
    const activityType = uniqueName("E2E Activity Type");
    await createActivity(page, activityName, activityType, cleanup);
    await expect(
      page.getByRole("row", { name: new RegExp(activityName, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // A non-matching search hides the row; searching its name brings it back.
    await page.getByPlaceholder("Search activities...").fill(uniqueName("zzz"));
    await expect(
      page.getByRole("row", { name: new RegExp(activityName, "i") }),
    ).not.toBeVisible({ timeout: 10000 });

    await page.getByPlaceholder("Search activities...").fill(activityName);
    await expect(
      page.getByRole("row", { name: new RegExp(activityName, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should start an activity from the list", async ({ page, cleanup }) => {
    const activityName = uniqueName("E2E Start Activity");
    const activityType = uniqueName("E2E Activity Type");
    await createActivity(page, activityName, activityType, cleanup);

    const row = page
      .getByRole("row", { name: new RegExp(activityName, "i") })
      .first();
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: "Toggle menu" }).click();
    await page
      .getByRole("menuitem", { name: "Start Activity" })
      .click({ force: true });

    // Starting spawns a running activity; the global banner's Stop appears.
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole("button", { name: "Stop" }).click({ force: true });
  });

  test("should stop a running activity", async ({ page, cleanup }) => {
    const activityName = uniqueName("E2E Stop Activity");
    const activityType = uniqueName("E2E Activity Type");
    await createActivity(page, activityName, activityType, cleanup);

    const row = page
      .getByRole("row", { name: new RegExp(activityName, "i") })
      .first();
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: "Toggle menu" }).click();
    await page
      .getByRole("menuitem", { name: "Start Activity" })
      .click({ force: true });
    const stopButton = page.getByRole("button", { name: "Stop" });
    await expect(stopButton).toBeVisible({ timeout: 10000 });

    await stopButton.click({ force: true });

    // Stopping clears the global banner and reloads the list; the just-stopped
    // activity now renders as a completed row with a computed duration (the
    // duration column only renders once endTime is set, i.e. the stop persisted).
    await expect(stopButton).not.toBeVisible({ timeout: 10000 });
    const stoppedRow = page
      .getByRole("row", { name: new RegExp(activityName, "i") })
      .first();
    await expect(stoppedRow).toBeVisible({ timeout: 10000 });
    await expect(stoppedRow).toContainText(/min/);
  });

  test("should delete an activity", async ({ page, cleanup }) => {
    const activityName = uniqueName("E2E Delete Activity");
    const activityType = uniqueName("E2E Activity Type");
    await createActivity(page, activityName, activityType, cleanup);

    const row = page
      .getByRole("row", { name: new RegExp(activityName, "i") })
      .first();
    await expect(row).toBeVisible({ timeout: 10000 });

    await row.getByRole("button", { name: "Toggle menu" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();
    await expect(page.getByRole("alertdialog")).toContainText(
      "Are you sure you want to delete this activity?",
    );
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();

    await expect(
      page.getByRole("row", { name: new RegExp(activityName, "i") }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
