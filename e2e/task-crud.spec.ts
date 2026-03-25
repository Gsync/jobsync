import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
});
