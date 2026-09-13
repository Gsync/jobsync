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

  test("should pause and resume an activity with a break", async ({
    page,
    cleanup,
  }) => {
    const activityName = uniqueName("E2E Break Activity");
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

    // Not getByRole({ name: "Stop" }) like the sibling tests: that is a
    // substring match, and the modal's Stop Activity button has the same
    // accessible name as the banner's. The aria-label attribute is the only
    // thing that distinguishes them, and only the banner sets it.
    const stopButton = page.locator('button[aria-label="Stop Activity"]');
    await expect(stopButton).toBeVisible({ timeout: 10000 });

    // The banner button only opens the modal; the break starts on play.
    await page.getByRole("button", { name: "Take a break" }).click();
    const breakDialog = page.getByRole("dialog");
    await expect(breakDialog).toBeVisible({ timeout: 10000 });
    await expect(breakDialog.getByText("Break", { exact: true })).toBeVisible();
    await expect(breakDialog.getByText("15:00")).toBeVisible();

    await breakDialog
      .getByRole("button", { name: "Start break", exact: true })
      .click();

    // The centre control flipping to Resume proves the server opened the
    // break: the context only re-renders from the action's returned activity.
    const resumeButton = breakDialog.getByRole("button", {
      name: "Resume activity",
      exact: true,
    });
    await expect(resumeButton).toBeVisible({ timeout: 10000 });
    // A running break drops the close X — Resume and Stop are the only exits.
    await expect(breakDialog.getByRole("button", { name: "Close" })).toHaveCount(
      0,
    );

    // The modal locks the app: nothing behind it is clickable, so navigating
    // away must fail rather than change the route.
    // Located by href, not by name: the sidebar collapses to icons, so the
    // "Jobs" label is not reliably part of the link's accessible name.
    await expect(
      page
        .locator('a[href="/dashboard/myjobs"]')
        .first()
        .click({ timeout: 3000 }),
    ).rejects.toThrow();
    await expect(page).toHaveURL(/\/dashboard\/activities/);

    await resumeButton.click();
    await expect(breakDialog).not.toBeVisible({ timeout: 10000 });

    // The activity survived the break and is still running.
    await expect(stopButton).toBeVisible();
    await stopButton.click({ force: true });
    await expect(stopButton).not.toBeVisible({ timeout: 10000 });
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
