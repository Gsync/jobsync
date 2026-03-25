import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function createTask(page: Page, title: string) {
  await page.getByTestId("add-task-btn").click({ force: true });
  await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();

  const titleInput = page.getByPlaceholder("Enter task title");
  await titleInput.waitFor({ state: "visible" });
  await titleInput.clear();
  await titleInput.fill(title);
  await titleInput.blur();

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

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

// storageState handles authentication — no per-test login needed

test.describe.serial("Task CRUD: Create, Edit, Delete", () => {
  const taskTitle = "Prepare portfolio presentation for client review";
  const updatedTaskTitle =
    "Prepare portfolio presentation for stakeholder review";

  test("should create a new task and verify it appears in the list", async ({
    page,
  }) => {
    await navigateToTasks(page);
    await createTask(page, taskTitle);

    // Verify the task appears in the table
    await expect(
      page
        .getByRole("row", { name: new RegExp(taskTitle, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should edit the task title and verify updated values", async ({
    page,
  }) => {
    await navigateToTasks(page);

    // Verify the task exists
    await expect(
      page
        .getByRole("row", { name: new RegExp(taskTitle, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Open edit via the actions menu
    await page
      .getByRole("row", { name: new RegExp(taskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Edit Task" })
      .click({ force: true });

    // Verify the dialog opens with the current title pre-filled
    await expect(page.getByTestId("task-form-dialog-title")).toBeVisible();
    await expect(page.getByPlaceholder("Enter task title")).toHaveValue(
      taskTitle,
    );

    // Update the title
    const titleInput = page.getByPlaceholder("Enter task title");
    await titleInput.clear();
    await titleInput.fill(updatedTaskTitle);
    await titleInput.blur();

    // Save changes
    const saveBtn = page.getByTestId("save-task-btn");
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    await expect(page.getByTestId("task-form-dialog-title")).not.toBeVisible({
      timeout: 10000,
    });

    // Verify the updated title appears in the table
    await expect(
      page
        .getByRole("row", { name: new RegExp(updatedTaskTitle, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should change task status via the actions menu", async ({ page }) => {
    await navigateToTasks(page);

    await expect(
      page
        .getByRole("row", { name: new RegExp(updatedTaskTitle, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    // Open the actions menu and change status
    await page
      .getByRole("row", { name: new RegExp(updatedTaskTitle, "i") })
      .getByTestId("task-actions-menu-btn")
      .first()
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Change Status" })
      .click({ force: true });
    await page
      .getByRole("menuitem", { name: "Needs Attention" })
      .click({ force: true });

    // Verify the toast confirms the status change
    await expect(page.getByRole("status").first()).toContainText(
      /Task status updated/,
    );
  });

  test("should delete the task and verify removal", async ({ page }) => {
    await navigateToTasks(page);

    await expect(
      page
        .getByRole("row", { name: new RegExp(updatedTaskTitle, "i") })
        .first(),
    ).toBeVisible({ timeout: 10000 });

    await deleteTask(page, updatedTaskTitle);

    // Verify the toast confirms deletion
    await expect(page.getByRole("status").first()).toContainText(
      /Task has been deleted/,
    );

    // Verify the task no longer appears in the table
    await expect(
      page.getByRole("row", { name: new RegExp(updatedTaskTitle, "i") }),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
