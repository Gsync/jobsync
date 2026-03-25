import { test, expect, type Page } from "@playwright/test";

// storageState handles authentication — no per-test login needed

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
  // Click "New Question" button — t("questions.newQuestion") = "New Question"
  await page.getByRole("button", { name: /New Question/ }).click();
  // Dialog title — t("questions.addQuestion") = "Add Question"
  await expect(
    page.getByRole("heading", { name: /Add Question/ }),
  ).toBeVisible();

  // Fill in the question text — placeholder is t("questions.questionPlaceholder") = "Enter your question..."
  await page.getByPlaceholder("Enter your question").fill(questionText);

  // Add a skill tag if provided — TagInput uses a button with text "Search or add a skill..."
  // and an input with placeholder "Type a skill..."
  if (tagLabel) {
    // Click the tag combobox trigger button. The button text is
    // t("jobs.searchSkill") = "Search or add a skill...". Use getByText to
    // locate it within the dialog context.
    await page.getByText("Search or add a skill").click();
    // Type in the search input (placeholder from t("jobs.typeSkill") = "Type a skill...")
    await page.getByPlaceholder(/Type a skill/).fill(tagLabel);
    await page.waitForTimeout(500);
    // Check if the tag already exists as an option, otherwise create it
    // Create option shows as: Create "tagLabel"
    const existingOption = page.getByRole("option", {
      name: tagLabel,
      exact: true,
    });
    const createOption = page.getByRole("option", {
      name: new RegExp(`Create.*${tagLabel}`),
    });
    try {
      await existingOption.waitFor({ state: "visible", timeout: 3000 });
      await existingOption.click();
    } catch {
      await createOption.waitFor({ state: "visible", timeout: 3000 });
      await createOption.click();
    }
    await page.waitForTimeout(300);
  }

  // Fill in the answer using Tiptap editor — interact via .tiptap CSS selector
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(answerText);

  // Submit the form — button text is t("questions.save") = "Save"
  await page.getByRole("button", { name: "Save" }).click();
}

async function deleteQuestion(page: Page, questionText: string) {
  // Find the specific question card that directly contains the question text button.
  // Each QuestionCard is a div.border.rounded-lg with the question title as a button.
  // Use the button with exact text to find the right card, then go to parent card.
  const questionButton = page
    .getByRole("button", { name: questionText })
    .first();
  // Navigate up to the card container
  const questionCard = questionButton.locator("xpath=ancestor::div[contains(@class, 'border') and contains(@class, 'rounded-lg')]").first();
  // Click the delete button — aria-label is t("questions.delete") = "Delete"
  await questionCard
    .getByRole("button", { name: /Delete/ })
    .first()
    .click({ force: true });

  // Confirm deletion in alert dialog
  // AlertDialogAction text is t("questions.delete") = "Delete"
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

    // Verify toast success message — t("questions.createdSuccess") = "Question has been created successfully"
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
      { timeout: 10000 },
    );

    // Verify the question card appears with the question text
    await expect(page.getByText(questionText).first()).toBeVisible();

    // Verify the answer preview is visible
    await expect(page.getByText(answerText).first()).toBeVisible();

    // Verify the tag badge is visible
    await expect(page.getByText(tagLabel).first()).toBeVisible();

    // Clean up
    await deleteQuestion(page, questionText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
      { timeout: 10000 },
    );
  });

  test("should edit an existing question", async ({ page }) => {
    await navigateToQuestions(page);
    await createQuestion(page, questionText, answerText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
      { timeout: 10000 },
    );

    // Click on the question text to trigger onEdit — the question title is a
    // clickable button element that calls onEdit
    await page.getByText(questionText).first().click();

    // Wait for the edit dialog to open — t("questions.editQuestion") = "Edit Question"
    await expect(
      page.getByRole("heading", { name: /Edit Question/ }),
    ).toBeVisible();

    // Modify the question text
    const questionInput = page.getByPlaceholder("Enter your question");
    await questionInput.clear();
    await questionInput.fill(updatedQuestionText);

    // Save changes
    await page.getByRole("button", { name: "Save" }).click();

    // Verify toast success message — t("questions.updatedSuccess") = "Question has been updated successfully"
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been updated/,
      { timeout: 10000 },
    );

    // Verify the updated text appears
    await expect(page.getByText(updatedQuestionText).first()).toBeVisible();

    // Clean up
    await deleteQuestion(page, updatedQuestionText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
      { timeout: 10000 },
    );
  });

  test("should delete a question", async ({ page }) => {
    const deleteQuestionText = "What is dependency injection?";
    const deleteAnswerText = "A design pattern for managing dependencies.";
    await navigateToQuestions(page);
    await createQuestion(page, deleteQuestionText, deleteAnswerText);
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been created/,
      { timeout: 10000 },
    );

    // Verify the question exists
    await expect(page.getByText(deleteQuestionText).first()).toBeVisible();

    // Delete the question via the delete icon button
    await deleteQuestion(page, deleteQuestionText);

    // Verify toast success message — t("questions.deletedSuccess") = "Question has been deleted successfully"
    await expect(page.getByRole("status").first()).toContainText(
      /Question has been deleted/,
      { timeout: 10000 },
    );
  });
});
