import { randomUUID } from "crypto";
import { type Locator, type Page } from "@playwright/test";
import {
  test,
  expect,
  createNewJob,
  uniqueName,
  type CleanupRegistry,
} from "./fixtures";

// selectOrCreate with an exact label: its substring match also hits the
// "Filter by role" select and the "Contacts" tabpanel. Same popover-close wait.
async function pick(
  page: Page,
  scope: Locator | Page,
  label: string,
  placeholder: string,
  value: string,
) {
  await scope.getByLabel(label, { exact: true }).click();
  const input = page.getByPlaceholder(placeholder);
  await input.fill(value);
  const createOption = page.getByText(`Create: ${value}`);
  const existingOption = page.getByRole("option", { name: value, exact: true });
  await expect(createOption.or(existingOption).first()).toBeVisible();
  if (await existingOption.isVisible()) {
    await existingOption.click();
  } else {
    await createOption.click();
  }
  await expect(input).not.toBeVisible({ timeout: 15000 });
}

async function navigateToContacts(page: Page) {
  await page.goto("/dashboard/admin?tab=contacts");
  await page.getByTestId("add-contact-btn").waitFor({ state: "visible" });
}

// The list is name-ordered and paginated, so a new row isn't guaranteed to
// be on page 1 — narrow it with the search box before asserting.
function contactRow(page: Page, name: string) {
  return page.getByRole("row").filter({ hasText: name });
}

async function searchContacts(page: Page, term: string) {
  await page.getByPlaceholder("Search contacts...").fill(term);
}

// Creates a contact from the Library Contacts tab. Company and role are
// inline-created through their comboboxes, so each is registered for
// teardown the moment it persists.
async function createContact(
  page: Page,
  cleanup: CleanupRegistry,
  name: string,
  options?: { title?: string; email?: string; company?: string; role?: string },
) {
  await page.getByTestId("add-contact-btn").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading", { name: "Add Contact" })).toBeVisible();

  await dialog.getByLabel("Name", { exact: true }).fill(name);
  if (options?.title) {
    await dialog.getByLabel("Title", { exact: true }).fill(options.title);
  }
  if (options?.email) {
    await dialog.getByLabel("Email", { exact: true }).fill(options.email);
  }
  if (options?.company) {
    await pick(page, dialog, "Company", "Create or Search company", options.company);
    cleanup.company(options.company);
  }
  if (options?.role) {
    await pick(page, dialog, "Role", "Create or Search role", options.role);
    cleanup.contactRole(options.role);
  }

  await dialog.getByRole("button", { name: "Save" }).click();
  cleanup.contact(name);
  await expect(dialog).not.toBeVisible();
}

async function openJobContactsTab(page: Page, jobId: string) {
  await page.goto(`/dashboard/myjobs/${jobId}?tab=contacts`);
}

// Links an existing contact to a job from the job's Contacts tab, creating a
// fresh role inline.
async function linkContactToJob(
  page: Page,
  cleanup: CleanupRegistry,
  jobId: string,
  contactName: string,
  roleName: string,
) {
  await openJobContactsTab(page, jobId);
  await page.getByRole("button", { name: "Add Contact" }).click();
  await pick(page, page, "Contact", "Search contact", contactName);
  await pick(page, page, "Role", "Create or Search role", roleName);
  cleanup.contactRole(roleName);
  await page.getByRole("button", { name: "Save", exact: true }).click();

  const link = page.getByRole("listitem").filter({ hasText: contactName });
  await expect(link).toBeVisible();
  await expect(link).toContainText(roleName);
}

test.describe("Contacts Library", () => {
  test("creates a contact with an inline company and role", async ({
    page,
    cleanup,
  }) => {
    const name = uniqueName("Dana Whitfield");
    const company = uniqueName("contact company");
    const role = uniqueName("Panel Lead");
    const email = `dana-${randomUUID().slice(0, 8)}@example.com`;

    await navigateToContacts(page);
    await createContact(page, cleanup, name, { email, company, role });

    await searchContacts(page, name);
    const row = contactRow(page, name);
    await expect(row).toContainText(company);
    await expect(row).toContainText(role);

    await page.getByRole("button", { name: `Expand ${name}` }).click();
    await expect(page.getByRole("link", { name: email })).toBeVisible();
  });

  test("edits a contact", async ({ page, cleanup }) => {
    const name = uniqueName("Riley Chen");

    await navigateToContacts(page);
    await createContact(page, cleanup, name, { title: "Recruiter" });
    await searchContacts(page, name);

    await contactRow(page, name)
      .getByRole("button", { name: "Toggle menu" })
      .click();
    await page.getByRole("menuitem", { name: "Edit Contact" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Edit Contact" })).toBeVisible();
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(name);
    await expect(dialog.getByLabel("Title", { exact: true })).toHaveValue(
      "Recruiter",
    );
    await dialog
      .getByLabel("Title", { exact: true })
      .fill("Engineering Manager");
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).not.toBeVisible();

    await expect(contactRow(page, name)).toContainText("Engineering Manager");
  });

  test("filters contacts by their standing role", async ({ page, cleanup }) => {
    // Shared suffix lets one search term match both contacts below
    const suffix = randomUUID().slice(0, 8);
    const withRole = `Morgan Hale ${suffix}`;
    const withoutRole = `Taylor Brooks ${suffix}`;
    const role = uniqueName("Reference Check");

    await navigateToContacts(page);
    await createContact(page, cleanup, withRole, { role });
    await createContact(page, cleanup, withoutRole);

    // The role filter's options load on mount, so pick up the new role
    await page.reload();
    await searchContacts(page, suffix);
    await expect(contactRow(page, withRole)).toBeVisible();
    await expect(contactRow(page, withoutRole)).toBeVisible();

    await page.getByLabel("Filter by role").click();
    await page.getByRole("option", { name: role, exact: true }).click();

    await expect(contactRow(page, withRole)).toBeVisible();
    await expect(contactRow(page, withoutRole)).not.toBeVisible();
  });

  test("warns before deleting a contact linked to a job, then removes the link", async ({
    page,
    cleanup,
  }) => {
    const name = uniqueName("Jordan Pike");
    const role = uniqueName("Interviewer");
    const jobText = uniqueName("contact delete job");

    const jobId = await createNewJob(page, jobText, cleanup);
    await navigateToContacts(page);
    await createContact(page, cleanup, name);
    await linkContactToJob(page, cleanup, jobId, name, role);

    await navigateToContacts(page);
    await searchContacts(page, name);
    const row = contactRow(page, name);
    await expect(row).toBeVisible();
    await row.getByRole("button", { name: "Toggle menu" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const alert = page.getByRole("alertdialog");
    await expect(alert).toContainText("Delete this contact?");
    await expect(alert).toContainText("linked to 1 job");
    await alert.getByRole("button", { name: "Delete" }).click();
    await expect(row).not.toBeVisible();

    await openJobContactsTab(page, jobId);
    await expect(page.getByText("No contacts on this job")).toBeVisible();
  });

  test("refuses to delete a role a contact holds", async ({
    page,
    cleanup,
  }) => {
    const name = uniqueName("Sam Ortiz");
    const role = uniqueName("Referrer Role");

    await navigateToContacts(page);
    await createContact(page, cleanup, name, { role });

    await page.goto("/dashboard/admin?tab=roles");
    await page.getByPlaceholder("Search roles...").fill(role);
    const row = page.getByRole("row").filter({ hasText: role });
    await row.getByRole("button", { name: "Toggle menu" }).click();
    await page.getByRole("menuitem", { name: "Delete" }).click();

    const alert = page.getByRole("alertdialog");
    await expect(alert).toContainText("Associated contacts exist!");
    await expect(alert).toContainText("set on 1 contact");
    await expect(alert.getByRole("button", { name: "Delete" })).toHaveCount(0);
  });
});

test.describe("Job Contacts tab", () => {
  test("links a contact with a role and unlinks it without deleting the contact", async ({
    page,
    cleanup,
  }) => {
    const name = uniqueName("Avery Lang");
    const role = uniqueName("Hiring Lead");
    const jobText = uniqueName("contact link job");

    const jobId = await createNewJob(page, jobText, cleanup);
    await navigateToContacts(page);
    await createContact(page, cleanup, name);
    await linkContactToJob(page, cleanup, jobId, name, role);

    await page.getByRole("button", { name: `Remove ${name}` }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByText("No contacts on this job")).toBeVisible();

    await navigateToContacts(page);
    await searchContacts(page, name);
    await expect(contactRow(page, name)).toBeVisible();
  });

  test("creates a new contact from the typed name and links it", async ({
    page,
    cleanup,
  }) => {
    const name = uniqueName("Casey Rowe");
    const role = uniqueName("Recruiter Role");
    const jobText = uniqueName("contact new job");

    const jobId = await createNewJob(page, jobText, cleanup);
    await openJobContactsTab(page, jobId);
    await page.getByRole("button", { name: "Add Contact" }).click();

    // The picker has no create path; what's typed carries into the dialog
    await page.getByLabel("Contact", { exact: true }).click();
    await page.getByPlaceholder("Search contact").fill(name);
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "New contact" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Name", { exact: true })).toHaveValue(name);
    await dialog.getByRole("button", { name: "Save" }).click();
    cleanup.contact(name);
    await expect(dialog).not.toBeVisible();
    await expect(page.getByLabel("Contact", { exact: true })).toContainText(
      name,
    );

    await pick(page, page, "Role", "Create or Search role", role);
    cleanup.contactRole(role);
    await page.getByRole("button", { name: "Save", exact: true }).click();

    const link = page.getByRole("listitem").filter({ hasText: name });
    await expect(link).toContainText(role);
  });
});

test.describe("Company Contacts tab", () => {
  test("adds a contact with the company prefilled", async ({
    page,
    cleanup,
  }) => {
    const company = uniqueName("Contacts Tab Company");
    const name = uniqueName("Robin Vale");

    await page.goto("/dashboard/admin");
    await page.getByTestId("add-company-btn").click();
    await page.getByLabel("Company Name").fill(company);
    await page.getByRole("button", { name: /save/i }).click();
    cleanup.company(company);
    await expect(page.getByRole("dialog")).not.toBeVisible();

    await page.getByPlaceholder("Search companies...").fill(company);
    await page.getByRole("link", { name: company, exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard\/admin\/companies\//);

    await page.getByRole("tab", { name: "Contacts" }).click();
    await expect(page.getByText("No contacts at this company yet")).toBeVisible();
    await page.getByRole("button", { name: "Add Contact" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByLabel("Company", { exact: true })).toContainText(
      company,
    );
    await dialog.getByLabel("Name", { exact: true }).fill(name);
    await dialog.getByRole("button", { name: "Save" }).click();
    cleanup.contact(name);
    await expect(dialog).not.toBeVisible();

    await expect(page.getByText("Works here")).toBeVisible();
    await expect(page.getByRole("row").filter({ hasText: name })).toBeVisible();
  });
});
