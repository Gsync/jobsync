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

async function navigateToQuestions(page: Page) {
  await page.goto("/dashboard/questions");
  await page.waitForLoadState("networkidle");
}

async function createQuestion(
  page: Page,
  questionText: string,
  answerText: string,
  tagLabel?: string,
) {
  // Click "New Question" button
  await page.getByRole("button", { name: /New Question/ }).click();
  await expect(
    page.getByRole("heading", { name: /Add Question/ }),
  ).toBeVisible();

  // Fill in the question text
  await page.getByPlaceholder("Enter your question").fill(questionText);

  // Add a skill tag if provided
  if (tagLabel) {
    await page.getByRole("combobox", { name: /Search or add a skill/ }).click();
    await page.getByPlaceholder(/Type a skill/).fill(tagLabel);
    await page.waitForTimeout(500);
    // Check if the tag already exists, otherwise create it
    const existingTag = page.getByRole("option", {
      name: tagLabel,
      exact: true,
    });
    const createTag = page.getByRole("option", {
      name: new RegExp(`Create.*${tagLabel}`),
    });
    try {
      await existingTag.waitFor({ state: "visible", timeout: 3000 });
      await existingTag.click();
    } catch {
      await createTag.waitFor({ state: "visible", timeout: 3000 });
      await createTag.click();
    }
    await page.waitForTimeout(300);
  }

  // Fill in the answer using Tiptap editor
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(answerText);

  // Submit the form
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteQuestion(page: Page, questionText: string) {
  // Find the question card and click the delete button
  const questionCard = page.locator(".border.rounded-lg", {
    hasText: questionText,
  });
  await questionCard
    .getByRole("button", { name: /Delete/ })
    .click({ force: true });

  // Confirm deletion in alert dialog
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: /Delete/ })
    .click({ force: true });
}

test.describe("Question CRUD", () => {
  const questionText = "What is your experience with TypeScript?";
  const answerText = "I have 5 years of experience with TypeScript.";
  const tagLabel = "TypeScript";
  const updatedQuestionText =
    "What is your advanced experience with TypeScript?";

  test("should create a new question", async ({ page }) => {
    await navigateToQuestions(page);
    await createQuestion(page, questionText, answerText, tagLabel);

    // Verify toast success message
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
    );

    // Verify the question card appears with the question text
    await expect(page.getByText(questionText)).toBeVisible();

    // Verify the answer preview is visible
    await expect(page.getByText(answerText)).toBeVisible();

    // Verify the tag badge is visible
    await expect(page.getByText(tagLabel).first()).toBeVisible();

    // Clean up
    await deleteQuestion(page, questionText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
    );
  });

  test("should edit an existing question", async ({ page }) => {
    await navigateToQuestions(page);
    await createQuestion(page, questionText, answerText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
    );

    // Click on the question text to open edit form (click-to-edit pattern)
    await page.getByText(questionText).click();

    // Wait for the edit dialog to open
    await expect(
      page.getByRole("heading", { name: /Edit Question/ }),
    ).toBeVisible();

    // Modify the question text
    const questionInput = page.getByPlaceholder("Enter your question");
    await questionInput.clear();
    await questionInput.fill(updatedQuestionText);

    // Save changes
    await page.getByRole("button", { name: "Save" }).click();

    // Verify toast success message
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been updated/,
    );

    // Verify the updated text appears
    await expect(page.getByText(updatedQuestionText)).toBeVisible();

    // Clean up
    await deleteQuestion(page, updatedQuestionText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
    );
  });

  test("should delete a question", async ({ page }) => {
    const deleteQuestionText = "What is dependency injection?";
    const deleteAnswerText = "A design pattern for managing dependencies.";
    await navigateToQuestions(page);
    await createQuestion(page, deleteQuestionText, deleteAnswerText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
    );

    // Verify the question exists
    await expect(page.getByText(deleteQuestionText)).toBeVisible();

    // Delete the question via the delete icon button
    await deleteQuestion(page, deleteQuestionText);

    // Verify toast success message
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
    );
  });
});
