import { type Page } from "@playwright/test";
import {
  test,
  expect,
  createNewJob,
  uniqueName,
  type CleanupRegistry,
} from "./fixtures";

async function navigateToDashboard(page: Page) {
  await page.goto("/dashboard");
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Dashboard", exact: true }),
  ).toBeVisible();
}

async function navigateToTasks(page: Page) {
  await page.goto("/dashboard/tasks");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-task-btn").waitFor({ state: "visible" });
}

async function createTaskWithActivityType(
  page: Page,
  title: string,
  activityType: string,
  cleanup: CleanupRegistry,
) {
  await page.getByTestId("add-task-btn").click({ force: true });
  await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();
  const titleInput = page.getByPlaceholder("Enter task title");
  await titleInput.waitFor({ state: "visible" });
  await titleInput.fill(title);
  await titleInput.blur();

  await page.getByText("Select activityType").click({ force: true });
  await page
    .getByPlaceholder("Create or Search activityType")
    .fill(activityType);
  const createOption = page.getByText(`Create: ${activityType}`);
  const existingOption = page.getByRole("option", {
    name: activityType,
    exact: true,
  });
  await expect(createOption.or(existingOption).first()).toBeVisible();
  if (await existingOption.isVisible()) {
    await existingOption.click({ force: true });
  } else {
    await createOption.click({ force: true });
  }
  await expect(
    page.getByPlaceholder("Create or Search activityType"),
  ).not.toBeVisible({ timeout: 15000 });
  cleanup.activityType(activityType);

  const saveBtn = page.getByTestId("save-task-btn");
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();
  await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
    timeout: 10000,
  });
  cleanup.task(title);
}

test.describe("Dashboard page", () => {
  test("should display all dashboard sections and reflect a newly applied job", async ({
    page,
    cleanup,
  }) => {
    const jobText = uniqueName("dashboard applied job");
    await createNewJob(page, jobText, cleanup, {
      beforeSave: async (page) => {
        await page.getByRole("switch").click();
      },
    });
    await expect(page.getByRole("row", { name: jobText }).first()).toBeVisible();

    await navigateToDashboard(page);

    await expect(
      page.getByRole("button", { name: "New Job" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "New Task" }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Jobs", exact: true }),
    ).toBeVisible();
    // exact: true — the weekly chart's Y-axis legend also renders
    // "JOBS APPLIED" (uppercase, via nivo axisLeftLegend), and getByText
    // matches case-insensitively by default, so it would otherwise resolve
    // to both elements.
    await expect(page.getByText("Jobs Applied", { exact: true })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Activities", exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Recent Jobs", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: jobText })).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Weekly Jobs", exact: true }),
    ).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Activity Calendar", exact: true }),
    ).toBeVisible();
    const currentYear = new Date().getFullYear().toString();
    await page.getByLabel("Select year").click();
    await expect(
      page.getByRole("option", { name: currentYear, exact: true }),
    ).toBeVisible();
  });

  test("should navigate to create a new job and a new task from dashboard quick actions", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "New Job" }).click();
    await expect(page).toHaveURL(/\/dashboard\/myjobs/);
    await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("add-job-dialog-title")).not.toBeVisible();

    await navigateToDashboard(page);
    await page.getByRole("button", { name: "New Task" }).click();
    await expect(page).toHaveURL(/\/dashboard\/tasks/);
  });

  test("should toggle the recent, weekly, jobs and activities cards", async ({
    page,
  }) => {
    const numberToggle = page.getByTestId("number-card-toggle-group");
    await numberToggle.getByRole("button", { name: "30d" }).click();
    await expect(
      numberToggle.getByRole("button", { name: "30d" }),
    ).toHaveClass(/bg-primary/);

    const topActivitiesToggle = page.getByTestId("top-activities-toggle-group");
    await topActivitiesToggle.getByRole("button", { name: "30d" }).click();
    await expect(
      topActivitiesToggle.getByRole("button", { name: "30d" }),
    ).toHaveClass(/bg-primary/);

    const recentToggle = page.getByTestId("recent-card-toggle-group");
    await recentToggle.getByRole("button", { name: "Activities" }).click();
    await expect(
      page.getByRole("heading", { name: "Recent Activities", exact: true }),
    ).toBeVisible();

    const weeklyToggle = page.getByTestId("weekly-chart-toggle-group");
    await weeklyToggle.getByRole("button", { name: "Activities" }).click();
    await expect(
      page.getByRole("heading", { name: "Weekly Activities", exact: true }),
    ).toBeVisible();
  });

  test("should discard a very short activity and not show it in the dashboard's recent activities list", async ({
    page,
    cleanup,
  }) => {
    // Activities below ACTIVITY_MIN_DURATION_MINUTES are discarded on stop
    // (src/context/ActivityContext.tsx), so a start immediately followed by
    // a stop is deleted server-side rather than saved.
    const taskTitle = uniqueName("E2E Dashboard Activity Task");
    const activityType = uniqueName("E2E Dashboard Activity Type");
    await navigateToTasks(page);
    await createTaskWithActivityType(page, taskTitle, activityType, cleanup);
    const taskRow = page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .first();
    await expect(taskRow).toBeVisible({ timeout: 10000 });

    await taskRow.hover();
    await taskRow.getByTestId("task-start-activity-btn").click({ force: true });
    // If another activity was already running (e.g. from a concurrently
    // running spec), confirm the switch instead of hanging on the dialog.
    const confirmSwitchBtn = page.getByRole("button", { name: "Stop & Start" });
    try {
      await confirmSwitchBtn.waitFor({ state: "visible", timeout: 3000 });
      await confirmSwitchBtn.click();
    } catch {
      // No conflicting activity, continue.
    }
    await expect(
      page.getByRole("button", { name: "Stop" }),
    ).toBeVisible({ timeout: 10000 });

    await page.getByRole("button", { name: "Stop" }).click({ force: true });
    await expect(page.getByRole("button", { name: "Stop" })).not.toBeVisible({
      timeout: 10000,
    });

    await navigateToDashboard(page);
    await page
      .getByTestId("recent-card-toggle-group")
      .getByRole("button", { name: "Activities" })
      .click();
    await expect(page.getByText(taskTitle, { exact: true })).not.toBeVisible();
  });
});
