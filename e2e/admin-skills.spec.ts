import { randomUUID } from "crypto";
import { type Page } from "@playwright/test";
import { test, expect, uniqueName, type CleanupRegistry } from "./fixtures";

async function navigateToSkills(page: Page) {
  await page.goto("/dashboard/admin?tab=skills");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /new skill/i }).waitFor({
    state: "visible",
  });
}

// Opens the New Skill dialog and saves a skill tag with the given name.
// Registers it for teardown as soon as it's persisted. Verifies via the
// search box rather than the unfiltered (page-1, count-ordered) list: the
// admin account has 100+ pre-existing skill tags, so a brand new row isn't
// guaranteed to land on page 1 of the default listing.
async function createSkill(
  page: Page,
  skillName: string,
  cleanup: CleanupRegistry,
) {
  await page.getByRole("button", { name: /new skill/i }).click();
  await expect(page.getByText("Add New Skill")).toBeVisible();

  await page.getByLabel("Skill Name").fill(skillName);
  await page.getByRole("button", { name: /save/i }).click();
  cleanup.tag(skillName);

  // Wait for the dialog to fully close before touching the search box —
  // filling it while the dialog is still closing is a no-op (the input
  // isn't interactable yet), leaving the search term empty.
  await expect(page.getByText("Add New Skill")).not.toBeVisible();

  const searchInput = page.getByPlaceholder("Search skills...");
  await searchInput.fill(skillName);
  await expect(
    page.getByRole("cell", { name: skillName, exact: true }),
  ).toBeVisible();
  await searchInput.fill("");
}

test.describe("Admin Skills search", () => {
  test("filters the skills list by name from the backend", async ({
    page,
    cleanup,
  }) => {
    // Shared suffix lets one search term match both skills below, without
    // depending on the unfiltered (pagination-sensitive) list.
    const suffix = randomUUID().slice(0, 8);
    const skillA = `Kubernetes ${suffix}`;
    const skillB = `GraphQL ${suffix}`;

    await navigateToSkills(page);
    await createSkill(page, skillA, cleanup);
    await createSkill(page, skillB, cleanup);

    const searchInput = page.getByPlaceholder("Search skills...");
    await searchInput.fill(skillA);

    await expect(
      page.getByRole("cell", { name: skillA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: skillB, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(skillB);

    await expect(
      page.getByRole("cell", { name: skillB, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: skillA, exact: true }),
    ).not.toBeVisible();

    await searchInput.fill(suffix);

    await expect(
      page.getByRole("cell", { name: skillA, exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("cell", { name: skillB, exact: true }),
    ).toBeVisible();
  });
});
