import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function navigateToTasks(page: Page) {
  await page.goto("/dashboard/tasks");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-task-btn").waitFor({ state: "visible" });
}

async function createTask(
  page: Page,
  title: string,
  options?: { activityType?: string },
) {
  await page.getByTestId("add-task-btn").click({ force: true });
  await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();

  const titleInput = page.getByPlaceholder("Enter task title");
  await titleInput.waitFor({ state: "visible" });
  await titleInput.clear();
  await titleInput.fill(title);
  await titleInput.blur();

  if (options?.activityType) {
    await page.getByText("Select activityType").click({ force: true });
    await page
      .getByPlaceholder("Create or Search activityType")
      .fill(options.activityType);
    await page.waitForTimeout(500);
    const existingOption = page.getByRole("option", {
      name: options.activityType,
      exact: true,
    });
    const createOption = page.getByText(`Create: ${options.activityType}`);
    if (await existingOption.isVisible()) {
      await existingOption.click({ force: true });
    } else if (await createOption.isVisible()) {
      await createOption.click({ force: true });
    }
    await page.waitForTimeout(300);
  }

  const saveBtn = page.getByTestId("save-task-btn");
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();

  await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
    timeout: 10000,
  });
}

async function expectToast(page: Page, pattern: RegExp) {
  await expect(page.getByText(pattern).first()).toBeVisible({ timeout: 10000 });
}

async function stopRunningActivity(page: Page) {
  await page.goto("/dashboard/activities");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-activity-btn").waitFor({ state: "visible" });
  const stopButton = page.getByRole("button", { name: "Stop" });
  try {
    await stopButton.waitFor({ state: "visible", timeout: 3000 });
    await stopButton.click({ force: true });
    await expect(stopButton).not.toBeVisible({ timeout: 10000 });
  } catch {
    // No running activity
  }
}

async function deleteTask(page: Page, title: string) {
  await page
    .getByRole("row", { name: new RegExp(title, "i") })
    .getByTestId("task-actions-menu-btn")
    .first()
    .click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
}

// ---------------------------------------------------------------------------
// Tests — each test is self-contained (create → assert → cleanup)
// ---------------------------------------------------------------------------

// storageState handles authentication — no per-test login needed

test.describe("Task CRUD", () => {
  test("should create a new task and verify it appears in the list", async ({
    page,
  }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Task ${uid}`;

    await navigateToTasks(page);
    await createTask(page, taskTitle);

    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await deleteTask(page, taskTitle);
  });

  test("should edit the task title and verify updated values", async ({
    page,
  }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Task ${uid}`;
    const updatedTitle = `E2E Task Updated ${uid}`;

    // Create
    await navigateToTasks(page);
    await createTask(page, taskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Edit
    await page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Edit Task" })
      .click({ force: true });

    await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();
    const titleInput = page.getByPlaceholder("Enter task title");
    await titleInput.clear();
    await titleInput.fill(updatedTitle);
    await titleInput.blur();

    const saveBtn = page.getByTestId("save-task-btn");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.getByRole("row", { name: new RegExp(updatedTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Cleanup
    await deleteTask(page, updatedTitle);
  });

  test("should change task status via the actions menu", async ({ page }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Task ${uid}`;

    // Create
    await navigateToTasks(page);
    await createTask(page, taskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Change status
    await page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Change Status" })
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Needs Attention" })
      .click({ force: true });

    await expect(page.getByRole("status").first()).toContainText(
      /Task status updated/,
    );

    // Cleanup
    await deleteTask(page, taskTitle);
  });

  test("should delete the task and verify removal", async ({ page }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Task ${uid}`;

    // Create
    await navigateToTasks(page);
    await createTask(page, taskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Delete
    await deleteTask(page, taskTitle);

    await expect(page.getByRole("status").first()).toContainText(
      /Task has been deleted/,
    );
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }),
    ).not.toBeVisible({ timeout: 10000 });
  });

  // --- Migrated from tasks.spec.ts (unique tests) ---

  test("should filter tasks by status", async ({ page }) => {
    await navigateToTasks(page);

    await page
      .getByRole("button", { name: "Status", exact: true })
      .click({ force: true });
    await expect(page.getByText("Filter by Status")).toBeVisible();

    const inProgressCheckbox = page.getByRole("menuitemcheckbox", {
      name: "In Progress",
    });
    await expect(inProgressCheckbox).toBeChecked();

    const needsAttentionCheckbox = page.getByRole("menuitemcheckbox", {
      name: "Needs Attention",
    });
    await expect(needsAttentionCheckbox).toBeChecked();

    const completeCheckbox = page.getByRole("menuitemcheckbox", {
      name: "Complete",
    });
    await expect(completeCheckbox).not.toBeChecked();

    await completeCheckbox.click({ force: true });
    await expect(completeCheckbox).toBeChecked();
  });

  test("should toggle task completion via checkbox", async ({ page }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Toggle ${uid}`;

    await navigateToTasks(page);
    await createTask(page, taskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    const taskRow = page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .first();
    await taskRow
      .getByRole("button", { name: "Mark as complete" })
      .click({ force: true });
    await expectToast(page, /Task status updated/);

    // Show completed tasks in filter to find and delete
    await page
      .getByRole("button", { name: "Status", exact: true })
      .click({ force: true });
    await page
      .getByRole("menuitemcheckbox", { name: "Complete" })
      .click({ force: true });
    await page.keyboard.press("Escape");

    await deleteTask(page, taskTitle);
  });

  test("should start activity from task and redirect to activities", async ({
    page,
  }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Activity Task ${uid}`;

    await stopRunningActivity(page);
    await navigateToTasks(page);
    await createTask(page, taskTitle, { activityType: "E2E Testing" });
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Wait for creation toast to disappear
    await expect(
      page.getByText(/Task has been created/).first(),
    ).not.toBeVisible({ timeout: 10000 });

    const taskRow = page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .first();
    await taskRow.hover();
    await taskRow
      .getByTestId("task-start-activity-btn")
      .click({ force: true });

    await expectToast(page, /Activity started from task/);
    await expect(page).toHaveURL(/\/dashboard\/activities/);

    // Stop the running activity
    await page.getByRole("button", { name: "Stop" }).click({ force: true });

    // Cleanup task
    await navigateToTasks(page);
    await deleteTask(page, taskTitle);
  });

  test("should not allow starting activity on completed task", async ({
    page,
  }) => {
    const uid = Date.now().toString(36);
    const taskTitle = `E2E Completed ${uid}`;

    await stopRunningActivity(page);
    await navigateToTasks(page);
    await createTask(page, taskTitle, { activityType: "E2E Testing" });
    await expect(
      page.getByRole("row", { name: new RegExp(taskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    // Mark as complete
    const taskRow = page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .first();
    await taskRow
      .getByRole("button", { name: "Mark as complete" })
      .click({ force: true });
    await expectToast(page, /Task status updated/);

    // Show completed tasks
    await page
      .getByRole("button", { name: "Status", exact: true })
      .click({ force: true });
    await page
      .getByRole("menuitemcheckbox", { name: "Complete" })
      .click({ force: true });
    await page.keyboard.press("Escape");

    // Try to start activity — should show error
    const completedRow = page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .first();
    await completedRow
      .getByTestId("task-actions-menu-btn")
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Start Activity" })
      .click({ force: true });

    await expectToast(
      page,
      /Cannot start an activity from a completed or cancelled task/,
    );

    await deleteTask(page, taskTitle);
  });
});
