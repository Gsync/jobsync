import { test, expect, type Page } from "@playwright/test";
import { selectOrCreateComboboxOption } from "../helpers";

// storageState handles authentication — no per-test login needed

async function navigateToActivities(page: Page) {
  await page.goto("/dashboard/activities");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-activity-btn").waitFor({ state: "visible" });
}

async function stopRunningActivity(page: Page) {
  const stopButton = page.getByRole("button", { name: "Stop Activity" });
  try {
    await stopButton.waitFor({ state: "visible", timeout: 3000 });
    await stopButton.click({ force: true });
    await expect(stopButton).not.toBeVisible({ timeout: 10000 });
    await page.reload();
    await page.waitForLoadState("networkidle");
  } catch {
    // No running activity, continue
  }
}

async function createActivity(
  page: Page,
  activityName: string,
  activityType: string,
  startTime: string,
  endTime: string,
) {
  // Click "Add New Activity" button
  await page.getByTestId("add-activity-btn").click({ force: true });
  // Dialog title: t("activities.addNewActivity") = "Add New Activity"
  await expect(
    page.getByRole("heading", { name: /Add New Activity/ }),
  ).toBeVisible();

  // Fill activity name — placeholder: t("activities.activityNamePlaceholder")
  await page
    .getByPlaceholder("Ex: Job Search, Learning skill, etc")
    .fill(activityName);

  // Select activity type via combobox
  // FormLabel text is t("activities.activityType") = "Activity Type"
  // ComboBox search placeholder: "Create or Search activityType"
  await selectOrCreateComboboxOption(
    page,
    "Activity Type",
    "Create or Search activityType",
    activityType,
  );
  await page.waitForTimeout(300);

  // Set start time — placeholder: t("activities.timePlaceholder") = "hh:mm AM/PM"
  const startTimeInput = page.getByPlaceholder("hh:mm AM/PM").first();
  await startTimeInput.clear();
  await startTimeInput.fill(startTime);

  // Set end time
  const endTimeInput = page.getByPlaceholder("hh:mm AM/PM").last();
  await endTimeInput.clear();
  await endTimeInput.fill(endTime);

  // Submit the form
  await page.getByTestId("save-activity-btn").click();

  // Wait for dialog to close
  await expect(
    page.getByRole("heading", { name: /Add New Activity/ }),
  ).not.toBeVisible({ timeout: 10000 });
}

async function deleteActivity(page: Page, activityName: string) {
  const activityRow = page
    .getByRole("row", { name: new RegExp(activityName, "i") })
    .first();
  // The ActivitiesTable dropdown trigger has sr-only text "Toggle menu"
  await activityRow
    .getByRole("button", { name: "Toggle menu" })
    .click({ force: true });
  // Menu item text is t("common.delete") = "Delete"
  await page.getByRole("menuitem", { name: /Delete/ }).click({ force: true });
  // Confirm deletion in DeleteAlertDialog — button text is t("common.delete") = "Delete"
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
}

test.describe("Activity CRUD", () => {
  test.beforeEach(async ({ page }) => {
    await navigateToActivities(page);
    await stopRunningActivity(page);
  });

  const activityName = "E2E Job Application Research";
  const activityType = "E2E Research";
  const startTime = "09:00 AM";
  const endTime = "10:30 AM";

  test("should create a new activity", async ({ page }) => {
    await createActivity(page, activityName, activityType, startTime, endTime);

    // Verify the activity appears in the table
    await expect(
      page
        .getByRole("row", { name: new RegExp(activityName, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteActivity(page, activityName);
    await expect(page.getByRole("status").first()).toContainText(
      /Activity has been deleted/,
      { timeout: 10000 },
    );
  });

  test("should create and then delete an activity", async ({ page }) => {
    const deleteActivityName = "E2E Delete Activity Test";
    const deleteActivityType = "E2E Cleanup";
    await createActivity(
      page,
      deleteActivityName,
      deleteActivityType,
      "02:00 PM",
      "03:00 PM",
    );

    // Verify activity exists
    await expect(
      page
        .getByRole("row", { name: new RegExp(deleteActivityName, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Delete the activity
    await deleteActivity(page, deleteActivityName);

    // Verify toast success message
    await expect(page.getByRole("status").first()).toContainText(
      /Activity has been deleted/,
      { timeout: 10000 },
    );
  });

  test("should create activity with different times", async ({ page }) => {
    const morningActivity = "E2E Morning Standup";
    const morningType = "E2E Meeting";
    await createActivity(
      page,
      morningActivity,
      morningType,
      "08:00 AM",
      "08:30 AM",
    );

    // Verify activity appears in the table
    await expect(
      page
        .getByRole("row", { name: new RegExp(morningActivity, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteActivity(page, morningActivity);
    await expect(page.getByRole("status").first()).toContainText(
      /Activity has been deleted/,
      { timeout: 10000 },
    );
  });
});
