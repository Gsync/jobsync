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

async function navigateToTasks(page: Page) {
  await page.goto("/dashboard/tasks");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-task-btn").waitFor({ state: "visible" });
}

async function createTask(
  page: Page,
  title: string,
  options?: { activityType?: string }
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

async function deleteTask(page: Page, title: string) {
  await page
    .getByRole("row", { name: new RegExp(title, "i") })
    .getByTestId("task-actions-menu-btn")
    .first()
    .click({ force: true });
  await page.getByRole("menuitem", { name: "Delete" }).click({ force: true });
  await page.getByRole("button", { name: "Delete" }).click({ force: true });
}

test.describe("Tasks Management", () => {
  const testTaskTitle = "E2E Test Task";

  test("should create a new task", async ({ page }) => {
    await navigateToTasks(page);
    await createTask(page, testTaskTitle);

    // Wait for the task to appear in the table
    await expect(
      page.getByRole("row", { name: new RegExp(testTaskTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    // Clean up
    await deleteTask(page, testTaskTitle);
  });

  test("should edit an existing task", async ({ page }) => {
    const editTaskTitle = "E2E Edit Task";
    await navigateToTasks(page);
    await createTask(page, editTaskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(editTaskTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByRole("row", { name: new RegExp(editTaskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Edit Task" })
      .click({ force: true });
    await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();
    await expect(page.getByPlaceholder("Enter task title")).toHaveValue(
      editTaskTitle
    );

    const updatedTitle = "E2E Edit Task Updated";
    const titleInput = page.getByPlaceholder("Enter task title");
    await titleInput.fill(updatedTitle);
    await titleInput.blur();

    const saveBtn = page.getByTestId("save-task-btn");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();
    await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
      timeout: 10000,
    });

    await expect(
      page.getByRole("row", { name: new RegExp(updatedTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    await deleteTask(page, updatedTitle);
  });

  test("should delete a task", async ({ page }) => {
    const deleteTaskTitle = "E2E Delete Task";
    await navigateToTasks(page);
    await createTask(page, deleteTaskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(deleteTaskTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    await deleteTask(page, deleteTaskTitle);

    await expect(page.getByRole("status").first()).toContainText(
      /Task has been deleted/
    );
  });

  test("should change task status via dropdown", async ({ page }) => {
    const statusTaskTitle = "E2E Status Task";
    await navigateToTasks(page);
    await createTask(page, statusTaskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(statusTaskTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByRole("row", { name: new RegExp(statusTaskTitle, "i") })
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
      /Task status updated/
    );

    await deleteTask(page, statusTaskTitle);
  });

  test("should filter tasks by status", async ({ page }) => {
    await navigateToTasks(page);

    await page.getByRole("button", { name: "Status" }).click({ force: true });
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
    const toggleTaskTitle = "E2E Toggle Task";
    await navigateToTasks(page);
    await createTask(page, toggleTaskTitle);
    await expect(
      page.getByRole("row", { name: new RegExp(toggleTaskTitle, "i") }).first()
    ).toBeVisible({ timeout: 10000 });

    const taskRow = page
      .getByRole("row", { name: new RegExp(toggleTaskTitle, "i") })
      .first();
    const completeBtn = taskRow.getByRole("button", {
      name: "Mark as complete",
    });
    await completeBtn.click({ force: true });

    await expect(page.getByRole("status").first()).toContainText(
      /Task status updated/
    );

    await page.getByRole("button", { name: "Status" }).click({ force: true });
    await page
      .getByRole("menuitemcheckbox", { name: "Complete" })
      .click({ force: true });
    await page.keyboard.press("Escape");

    await deleteTask(page, toggleTaskTitle);
  });

  test.describe.serial("Task Activity Integration", () => {
    test.beforeEach(async ({ page }) => {
      // Stop any running activity first
      await page.goto("/dashboard/activities");
      await page.waitForLoadState("networkidle");
      const stopButton = page.getByRole("button", { name: "Stop" });
      const isStopVisible = await stopButton.isVisible();
      if (isStopVisible) {
        await stopButton.click({ force: true });
        await page.waitForTimeout(500);
      }
    });

    test("should start activity from task and redirect to activities", async ({
      page,
    }) => {
      const activityTaskTitle = "E2E Start Activity Task";
      await navigateToTasks(page);
      await createTask(page, activityTaskTitle, {
        activityType: "E2E Testing",
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(activityTaskTitle, "i") })
          .first()
      ).toBeVisible({ timeout: 10000 });

      const taskRow = page
        .getByRole("row", { name: new RegExp(activityTaskTitle, "i") })
        .first();
      await taskRow.hover();
      await taskRow
        .getByTestId("task-start-activity-btn")
        .click({ force: true });

      await expect(page.getByRole("status").first()).toContainText(
        /Activity started from task/
      );
      await expect(page).toHaveURL(/\/dashboard\/activities/);

      // Stop the running activity
      await page.getByRole("button", { name: "Stop" }).click({ force: true });

      // Go back and delete the task
      await navigateToTasks(page);
      await deleteTask(page, activityTaskTitle);
    });

    test("should not allow starting activity when task already has linked activity", async ({
      page,
    }) => {
      const linkedActivityTaskTitle = "E2E Linked Activity Task";
      await navigateToTasks(page);
      await createTask(page, linkedActivityTaskTitle, {
        activityType: "E2E Testing",
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(linkedActivityTaskTitle, "i") })
          .first()
      ).toBeVisible({ timeout: 10000 });

      // Start activity from task
      const taskRow = page
        .getByRole("row", { name: new RegExp(linkedActivityTaskTitle, "i") })
        .first();
      await taskRow.hover();
      await taskRow
        .getByTestId("task-start-activity-btn")
        .click({ force: true });
      await expect(page).toHaveURL(/\/dashboard\/activities/);

      // Stop the activity so we can test the linked state
      await page.getByRole("button", { name: "Stop" }).click({ force: true });

      // Go back to tasks
      await navigateToTasks(page);
      const taskRowAfter = page
        .getByRole("row", { name: new RegExp(linkedActivityTaskTitle, "i") })
        .first();

      // Start activity button should not be visible (task has linked activity)
      await taskRowAfter.hover();
      await expect(
        taskRowAfter.getByTestId("task-start-activity-btn")
      ).not.toBeVisible();

      // Menu item should be disabled
      await taskRowAfter
        .getByTestId("task-actions-menu-btn")
        .click({ force: true });
      const startActivityMenuItem = page.getByRole("menuitem", {
        name: "Start Activity",
      });
      await expect(startActivityMenuItem).toBeDisabled();
      await page.keyboard.press("Escape");

      // Cleanup: delete the activity first, then the task
      await page.goto("/dashboard/activities");
      await page
        .getByRole("row", { name: new RegExp(linkedActivityTaskTitle, "i") })
        .getByRole("button")
        .first()
        .click({ force: true });
      await page
        .getByRole("menuitem", { name: "Delete" })
        .click({ force: true });
      await page.getByRole("button", { name: "Delete" }).click({ force: true });

      await navigateToTasks(page);
      await deleteTask(page, linkedActivityTaskTitle);
    });

    test("should not allow starting activity on completed task", async ({
      page,
    }) => {
      const completedTaskTitle = "E2E Completed Task";
      await navigateToTasks(page);
      await createTask(page, completedTaskTitle, {
        activityType: "E2E Testing",
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(completedTaskTitle, "i") })
          .first()
      ).toBeVisible({ timeout: 10000 });

      // Mark task as complete
      const taskRow = page
        .getByRole("row", { name: new RegExp(completedTaskTitle, "i") })
        .first();
      await taskRow
        .getByRole("button", { name: "Mark as complete" })
        .click({ force: true });
      await expect(page.getByRole("status").first()).toContainText(
        /Task status updated/
      );

      // Add Complete status to filter to see completed tasks
      await page.getByRole("button", { name: "Status" }).click({ force: true });
      await page
        .getByRole("menuitemcheckbox", { name: "Complete" })
        .click({ force: true });
      await page.keyboard.press("Escape");

      // Try to start activity via menu - should show error
      const completedTaskRow = page
        .getByRole("row", { name: new RegExp(completedTaskTitle, "i") })
        .first();
      await completedTaskRow
        .getByTestId("task-actions-menu-btn")
        .click({ force: true });
      await page
        .getByRole("menuitem", { name: "Start Activity" })
        .click({ force: true });

      await expect(page.getByRole("status").first()).toContainText(
        /Cannot start an activity from a completed or cancelled task/
      );

      await deleteTask(page, completedTaskTitle);
    });
  });
});
