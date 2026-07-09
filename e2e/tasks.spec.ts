import { type Page } from "@playwright/test";
import { test, expect, uniqueName, type CleanupRegistry } from "./fixtures";

async function navigateToTasks(page: Page) {
  await page.goto("/dashboard/tasks");
  await page.waitForLoadState("networkidle");
  await page.getByTestId("add-task-btn").waitFor({ state: "visible" });
}

async function createTask(
  page: Page,
  title: string,
  cleanup: CleanupRegistry,
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
    const createOption = page.getByText(`Create: ${options.activityType}`);
    const existingOption = page.getByRole("option", {
      name: options.activityType,
      exact: true,
    });
    // Deterministic wait for the debounced list instead of a fixed timeout.
    await expect(createOption.or(existingOption).first()).toBeVisible();
    if (await existingOption.isVisible()) {
      await existingOption.click({ force: true });
    } else {
      await createOption.click({ force: true });
    }
    // Creating runs a server action inside a React transition; the popover only
    // closes once it resolves. Wait for that so the task saves with the type
    // committed (slow against the dev server under parallel load).
    await expect(
      page.getByPlaceholder("Create or Search activityType"),
    ).not.toBeVisible({ timeout: 15000 });
    cleanup.activityType(options.activityType);
  }

  const saveBtn = page.getByTestId("save-task-btn");
  await expect(saveBtn).toBeEnabled();
  await saveBtn.click();
  await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
    timeout: 10000,
  });
  cleanup.task(title);
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
  test("should create a new task", async ({ page, cleanup }) => {
    const testTaskTitle = uniqueName("E2E Test Task");
    await navigateToTasks(page);
    await createTask(page, testTaskTitle, cleanup);

    await expect(
      page.getByRole("row", { name: new RegExp(testTaskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should edit an existing task", async ({ page, cleanup }) => {
    const editTaskTitle = uniqueName("E2E Edit Task");
    const updatedTitle = uniqueName("E2E Edit Task Updated");
    // Register the updated title too, since it's what the row becomes on success.
    cleanup.task(updatedTitle);
    await navigateToTasks(page);
    await createTask(page, editTaskTitle, cleanup);
    await expect(
      page.getByRole("row", { name: new RegExp(editTaskTitle, "i") }).first(),
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
      editTaskTitle,
    );

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
      page.getByRole("row", { name: new RegExp(updatedTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should delete a task", async ({ page, cleanup }) => {
    const deleteTaskTitle = uniqueName("E2E Delete Task");
    // Registered as a safety net; the test deletes the task via the UI below
    // and the cleanup API is idempotent if the row is already gone.
    await navigateToTasks(page);
    await createTask(page, deleteTaskTitle, cleanup);
    await expect(
      page.getByRole("row", { name: new RegExp(deleteTaskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    await deleteTask(page, deleteTaskTitle);

    await expect(
      page.getByRole("row", { name: new RegExp(deleteTaskTitle, "i") }),
    ).not.toBeVisible();
  });

  test("should change task status via dropdown", async ({ page, cleanup }) => {
    const statusTaskTitle = uniqueName("E2E Status Task");
    await navigateToTasks(page);
    await createTask(page, statusTaskTitle, cleanup);
    await expect(
      page.getByRole("row", { name: new RegExp(statusTaskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    await page
      .getByRole("row", { name: new RegExp(statusTaskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    // Radix submenus open on hover; clicking the subtrigger can toggle it
    // shut mid-open, so hover to open then wait for the item.
    await page.getByRole("menuitem", { name: "Change Status" }).hover();
    const needsAttentionItem = page.getByRole("menuitem", {
      name: "Needs Attention",
    });
    await expect(needsAttentionItem).toBeVisible();
    await needsAttentionItem.click();

    // Assert on the persistent status badge rather than the toast, which
    // auto-dismisses after 5s and can vanish before the poll under load.
    await expect(
      page
        .getByRole("row", { name: new RegExp(statusTaskTitle, "i") })
        .getByText("Needs Attention"),
    ).toBeVisible();
  });

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

  test("should toggle task completion via checkbox", async ({
    page,
    cleanup,
  }) => {
    const toggleTaskTitle = uniqueName("E2E Toggle Task");
    await navigateToTasks(page);
    await createTask(page, toggleTaskTitle, cleanup);
    await expect(
      page.getByRole("row", { name: new RegExp(toggleTaskTitle, "i") }).first(),
    ).toBeVisible({ timeout: 10000 });

    const taskRow = page
      .getByRole("row", { name: new RegExp(toggleTaskTitle, "i") })
      .first();
    const completeBtn = taskRow.getByRole("button", {
      name: "Mark as complete",
    });
    await completeBtn.click({ force: true });

    // The button's label flips on success; assert that instead of the toast,
    // which auto-dismisses after 5s and can vanish before the poll under load.
    await expect(
      taskRow.getByRole("button", { name: "Mark as in progress" }),
    ).toBeVisible();
  });

  test.describe.serial("Task Activity Integration", () => {
    test.beforeEach(async ({ page }) => {
      // Stop any running activity first
      await page.goto("/dashboard/activities");
      await page.waitForLoadState("networkidle");
      // Wait for the activities page to be fully loaded
      await page.getByTestId("add-activity-btn").waitFor({ state: "visible" });
      // Try to find and click the Stop button if it exists
      const stopButton = page.getByRole("button", { name: "Stop" });
      try {
        await stopButton.waitFor({ state: "visible", timeout: 3000 });
        await stopButton.click({ force: true });
        // Wait for the activity to actually stop (button should disappear)
        await expect(stopButton).not.toBeVisible({ timeout: 10000 });
        // Reload to ensure clean state
        await page.reload();
        await page.waitForLoadState("networkidle");
      } catch {
        // No running activity, continue
      }
    });

    test("should start activity from task and redirect to activities", async ({
      page,
      cleanup,
    }) => {
      const activityTaskTitle = uniqueName("E2E Start Activity Task");
      await navigateToTasks(page);
      await createTask(page, activityTaskTitle, cleanup, {
        activityType: uniqueName("E2E Testing"),
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(activityTaskTitle, "i") })
          .first(),
      ).toBeVisible({ timeout: 10000 });

      const taskRow = page
        .getByRole("row", { name: new RegExp(activityTaskTitle, "i") })
        .first();
      await taskRow.hover();
      await taskRow
        .getByTestId("task-start-activity-btn")
        .click({ force: true });

      await expect(page).toHaveURL(/\/dashboard\/activities/);

      // Stop the running activity (the linked activity row is removed by the
      // cleanup fixture along with the task).
      await page.getByRole("button", { name: "Stop" }).click({ force: true });
    });

    test("should not allow starting activity when task already has linked activity", async ({
      page,
      cleanup,
    }) => {
      const linkedActivityTaskTitle = uniqueName("E2E Linked Activity Task");
      await navigateToTasks(page);
      await createTask(page, linkedActivityTaskTitle, cleanup, {
        activityType: uniqueName("E2E Testing"),
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(linkedActivityTaskTitle, "i") })
          .first(),
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
        taskRowAfter.getByTestId("task-start-activity-btn"),
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
    });

    test("should not allow starting activity on completed task", async ({
      page,
      cleanup,
    }) => {
      const completedTaskTitle = uniqueName("E2E Completed Task");
      await navigateToTasks(page);
      await createTask(page, completedTaskTitle, cleanup, {
        activityType: uniqueName("E2E Testing"),
      });
      await expect(
        page
          .getByRole("row", { name: new RegExp(completedTaskTitle, "i") })
          .first(),
      ).toBeVisible({ timeout: 10000 });

      // Mark task as complete
      const taskRow = page
        .getByRole("row", { name: new RegExp(completedTaskTitle, "i") })
        .first();
      await taskRow
        .getByRole("button", { name: "Mark as complete" })
        .click({ force: true });
      // Button label flips on success; assert that rather than the transient
      // toast so the following steps run against a committed status.
      await expect(
        taskRow.getByRole("button", { name: "Mark as in progress" }),
      ).toBeVisible();

      // Add Complete status to filter to see completed tasks
      await page
        .getByRole("button", { name: "Status", exact: true })
        .click({ force: true });
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
        /Cannot start an activity from a completed or cancelled task/,
      );
    });
  });
});
