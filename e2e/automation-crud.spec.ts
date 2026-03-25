import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function login(page: Page) {
  // Wait for the login form to be fully loaded
  await page.getByPlaceholder("id@example.com").waitFor({ state: "visible", timeout: 10000 });
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByLabel("Password").click();
  await page.getByLabel("Password").fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

/**
 * Ensure at least one resume exists, which is required before creating
 * an automation. Returns the title of the resume.
 */
async function ensureResumeExists(page: Page): Promise<string> {
  const resumeTitle = "E2E Automation Resume";
  await page.goto("/dashboard/profile");
  await page.waitForLoadState("networkidle");

  // Check if the resume already exists
  const existingRow = page.getByRole("row", {
    name: new RegExp(resumeTitle, "i"),
  });
  try {
    await existingRow.first().waitFor({ state: "visible", timeout: 3000 });
    return resumeTitle;
  } catch {
    // Resume does not exist yet — create one
  }

  // Click "New Resume" button — t("profile.newResume") = "New Resume"
  await page.getByRole("button", { name: "New Resume" }).click();
  // Fill title — placeholder in CreateResume is "Ex: Full Stack Developer Angular, Java"
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(resumeTitle);
  // Click Save button
  await page.getByRole("button", { name: "Save" }).click();
  // Toast message: "Resume title has been created successfully"
  await expect(page.getByRole("status").first()).toContainText(
    /Resume title has been/,
    { timeout: 10000 },
  );
  return resumeTitle;
}

async function navigateToAutomations(page: Page) {
  await page.goto("/dashboard/automations");
  await page.waitForLoadState("networkidle");
}

/**
 * Walk through the 6-step automation wizard using EURES (no API key required).
 */
async function createAutomation(
  page: Page,
  opts: {
    name: string;
    keywords: string;
    location: string;
    resumeTitle: string;
  },
) {
  // Click "Create Automation" button in AutomationContainer
  await page
    .getByRole("button", { name: /Create Automation/i })
    .click();
  // Dialog title: t("automations.createAutomation") = "Create Automation"
  await expect(
    page.getByRole("heading", { name: /Create Automation/i }),
  ).toBeVisible();

  // -----------------------------------------------------------------------
  // Step 1 (Basics): Name + Job Board
  // -----------------------------------------------------------------------
  // Name input placeholder: t("automations.automationNamePlaceholder") = "e.g. Frontend Jobs Berlin"
  await page
    .getByPlaceholder(/Frontend Jobs Berlin/i)
    .fill(opts.name);

  // Select EURES as the job board (uses Select component, not Combobox)
  // The SelectTrigger shows the current value — default is "JSearch"
  // Click the trigger to open the dropdown
  await page.getByRole("combobox", { name: /Job Board/i }).click();
  // Select EURES option — t("automations.eures") = "EURES"
  await page.getByRole("option", { name: /EURES/i }).click();

  // Proceed to next step — t("automations.next") = "Next"
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 2 (Search): Keywords + Location
  // -----------------------------------------------------------------------
  // For EURES, keywords use EuresOccupationCombobox
  // The combobox trigger button text is "Search occupations" initially
  // Click it to open, then type and press Enter to add custom keyword
  const keywordsCombobox = page.getByRole("combobox").filter({ hasText: /Search occupations|keyword/i });
  if (await keywordsCombobox.isVisible().catch(() => false)) {
    await keywordsCombobox.click();
    // Search input placeholder: "Search occupations or type custom keyword..."
    const searchInput = page.getByPlaceholder(/Search occupations/i);
    await searchInput.fill(opts.keywords);
    await page.waitForTimeout(800);
    // Try to select the first option (custom keyword or ESCO match)
    const firstOption = page.getByRole("option").first();
    try {
      await firstOption.waitFor({ state: "visible", timeout: 5000 });
      await firstOption.click();
    } catch {
      // Press Enter to add as custom keyword
      await searchInput.press("Enter");
    }
    // Close the popover by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // Location field — EURES uses EuresLocationCombobox
  // The combobox trigger button text is "Select countries or regions" initially
  const locationCombobox = page.getByRole("combobox").filter({ hasText: /Select countries|location/i });
  if (await locationCombobox.isVisible().catch(() => false)) {
    await locationCombobox.click();
    // Wait for countries to load from API
    await page.waitForTimeout(2000);
    // Search input placeholder: "Search countries or NUTS regions..."
    const locationInput = page.getByPlaceholder(/Search countries/i);
    await locationInput.fill(opts.location);
    await page.waitForTimeout(1000);
    const firstLocOption = page.getByRole("option").first();
    try {
      await firstLocOption.waitFor({ state: "visible", timeout: 8000 });
      await firstLocOption.click();
    } catch {
      // fallback: location may be accepted as text
    }
    // Close the popover by pressing Escape
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
  }

  // Proceed to next step
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 3 (Resume): Select resume
  // -----------------------------------------------------------------------
  // Uses Select component with placeholder "Select a resume"
  // The FormLabel is "Resume for Matching"
  await page
    .getByRole("combobox", { name: /Resume for Matching/i })
    .click();
  await page
    .getByRole("option", { name: opts.resumeTitle })
    .first()
    .click();

  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 4 (Matching): Threshold — leave default (80%) or disable AI scoring
  // -----------------------------------------------------------------------
  // Leave AI scoring enabled with default threshold
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 5 (Schedule): Select frequency + time
  // -----------------------------------------------------------------------
  // Leave defaults (daily at 08:00)
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 6 (Review): Submit
  // -----------------------------------------------------------------------
  // Verify some review fields are populated (within the dialog)
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText(opts.name)).toBeVisible();

  // Submit — button text is t("automations.createAutomation") = "Create Automation"
  await page
    .getByRole("button", { name: /Create Automation/i })
    .click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard", { timeout: 30000 });
});

test.describe.serial("Automation CRUD: Create, Verify, Delete", () => {
  const automationName = "React Developer Jobs Europe";
  let resumeTitle: string;

  test("should create an automation through the 6-step wizard", async ({
    page,
  }) => {
    // Prerequisite: ensure a resume exists
    resumeTitle = await ensureResumeExists(page);

    await navigateToAutomations(page);

    await createAutomation(page, {
      name: automationName,
      keywords: "Software Developer",
      location: "Germany",
      resumeTitle,
    });

    // After successful creation, the wizard closes and the automation list refreshes.
    // Wait for the wizard dialog to close.
    // If there's a validation error, it will show a toast within the dialog.
    await page.waitForTimeout(3000);

    // Check if the dialog closed successfully
    const dialogStillOpen = await page
      .getByRole("dialog")
      .isVisible()
      .catch(() => false);

    if (dialogStillOpen) {
      // If dialog is still open, the submit may have failed. Close it.
      await page.getByRole("button", { name: "Close" }).click();
    }

    // Verify the automation appears in the list
    await page.goto("/dashboard/automations");
    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(automationName).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test("should display the automation in the list with correct details", async ({
    page,
  }) => {
    await navigateToAutomations(page);

    // The automation should appear as a card/link in the list
    const automationCard = page.getByText(automationName).first();
    await expect(automationCard).toBeVisible({ timeout: 10000 });

    // Verify the job board badge (eures) — Badge text is "eures" (lowercase, from automation.jobBoard)
    await expect(page.getByText("eures").first()).toBeVisible();

    // Verify status badge shows "active"
    await expect(page.getByText("active").first()).toBeVisible();
  });

  test("should delete the automation and verify removal", async ({
    page,
  }) => {
    await navigateToAutomations(page);

    // Find the automation card (rendered as a Link with automation name)
    const automationCard = page
      .locator("a", { hasText: automationName })
      .first();
    await expect(automationCard).toBeVisible({ timeout: 10000 });

    // Click the more-actions button (DropdownMenuTrigger with MoreHorizontal icon)
    // within the automation card. Use preventDefault to avoid navigation.
    const moreButton = automationCard.getByRole("button").first();
    await moreButton.click({ force: true });

    // Click Delete from the dropdown menu
    // Menu item text is t("automations.delete") = "Delete"
    await page.getByRole("menuitem", { name: /Delete/i }).click();

    // Confirm deletion in the alert dialog
    // AlertDialogAction text is t("automations.delete") = "Delete"
    await expect(
      page.getByRole("alertdialog"),
    ).toBeVisible();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: /Delete/i })
      .click();

    // Wait for success toast — title is "Automation deleted"
    await expect(page.getByRole("status").first()).toContainText(
      /Automation deleted|deleted/i,
      { timeout: 10000 },
    );

    // Verify automation is no longer in the list
    await expect(
      page.getByText(automationName),
    ).not.toBeVisible({ timeout: 10000 });
  });
});
