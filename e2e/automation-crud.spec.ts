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

  await page.getByRole("button", { name: "New Resume" }).click();
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(resumeTitle);
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("status").first()).toContainText(
    /Resume title has been created/,
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
  // Click "Create Automation" button
  await page
    .getByRole("button", { name: /Create Automation/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /Create Automation/i }),
  ).toBeVisible();

  // -----------------------------------------------------------------------
  // Step 1 (Basics): Name + Job Board
  // -----------------------------------------------------------------------
  await page
    .getByPlaceholder(/Frontend Jobs Berlin/i)
    .fill(opts.name);

  // Select EURES as the job board (no API key needed)
  await page.getByRole("combobox").filter({ hasText: /JSearch/i }).click();
  await page.getByRole("option", { name: /EURES/i }).click();

  // Proceed to next step
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 2 (Search): Keywords + Location
  // -----------------------------------------------------------------------
  // For EURES, keywords and location use special comboboxes.
  // We use the plain input approach that works for non-EURES boards by
  // typing into the search inputs of the ESCO occupation / EURES location
  // comboboxes.
  //
  // Keywords field — EURES uses EuresOccupationCombobox
  // Fill keywords input or combobox search
  const keywordsInput = page.getByPlaceholder(/Search occupations/i);
  const keywordsPlainInput = page.getByPlaceholder(
    /React Developer, Frontend Engineer/i,
  );
  if (await keywordsInput.isVisible().catch(() => false)) {
    await keywordsInput.fill(opts.keywords);
    await page.waitForTimeout(800);
    // Select the first matching option if available
    const firstOption = page.getByRole("option").first();
    try {
      await firstOption.waitFor({ state: "visible", timeout: 5000 });
      await firstOption.click();
    } catch {
      // If no ESCO options load, the field value should still be set
    }
  } else if (await keywordsPlainInput.isVisible().catch(() => false)) {
    await keywordsPlainInput.fill(opts.keywords);
  }

  // Location field — EURES uses EuresLocationCombobox
  const locationInput = page.getByPlaceholder(/Search location/i);
  const locationPlainInput = page.getByPlaceholder(
    /Berlin, Germany/i,
  );
  if (await locationInput.isVisible().catch(() => false)) {
    await locationInput.fill(opts.location);
    await page.waitForTimeout(800);
    const firstLocOption = page.getByRole("option").first();
    try {
      await firstLocOption.waitFor({ state: "visible", timeout: 5000 });
      await firstLocOption.click();
    } catch {
      // fallback: location may be accepted as text
    }
  } else if (await locationPlainInput.isVisible().catch(() => false)) {
    await locationPlainInput.fill(opts.location);
  }

  // The Next button should be enabled once both fields are filled
  await page.getByRole("button", { name: /Next/i }).click();

  // -----------------------------------------------------------------------
  // Step 3 (Resume): Select resume
  // -----------------------------------------------------------------------
  // Click the resume selector and pick the resume we ensured exists
  await page
    .getByRole("combobox")
    .filter({ hasText: /Select a resume/i })
    .click();
  await page
    .getByRole("option", { name: opts.resumeTitle })
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
  // Verify some review fields are populated
  await expect(page.getByText(opts.name)).toBeVisible();

  // Submit
  await page
    .getByRole("button", { name: /Create Automation/i })
    .click();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page, baseURL }) => {
  await page.goto("/");
  await login(page);
  await expect(page).toHaveURL(baseURL + "/dashboard");
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

    // Wait for success toast
    await expect(page.getByRole("status").first()).toContainText(
      /Automation Created|Automation has been created/i,
      { timeout: 10000 },
    );
  });

  test("should display the automation in the list with correct details", async ({
    page,
  }) => {
    await navigateToAutomations(page);

    // The automation should appear as a card/link in the list
    const automationCard = page.getByText(automationName).first();
    await expect(automationCard).toBeVisible({ timeout: 10000 });

    // Verify the job board badge (EURES)
    await expect(page.getByText("eures").first()).toBeVisible();

    // Verify status badge shows "active"
    await expect(page.getByText("active").first()).toBeVisible();
  });

  test("should delete the automation and verify removal", async ({
    page,
  }) => {
    await navigateToAutomations(page);

    // Find the automation and open its actions menu
    const automationCard = page
      .locator("a", { hasText: automationName })
      .first();
    await expect(automationCard).toBeVisible({ timeout: 10000 });

    // Click the more-actions button within the automation card
    const moreButton = automationCard.getByRole("button").first();
    // Prevent navigation when clicking the dropdown trigger
    await moreButton.click({ force: true });

    // Click Delete from the dropdown menu
    await page.getByRole("menuitem", { name: /Delete/i }).click();

    // Confirm deletion in the alert dialog
    await expect(
      page.getByRole("alertdialog"),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Delete/i })
      .click();

    // Wait for success toast
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
