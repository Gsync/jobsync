import { type Download, type Page } from "@playwright/test";
import {
  test,
  expect,
  uniqueName,
  type CleanupRegistry,
} from "../fixtures";

// Only the magic bytes are checked server-side, so a stub PDF is enough.
const STUB_PDF = Buffer.from("%PDF-1.4\n% e2e stub resume\n%%EOF\n");

async function readDownload(download: Download): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of await download.createReadStream()) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

async function createResume(
  page: Page,
  title: string,
  cleanup: CleanupRegistry,
) {
  await page.goto("/dashboard/profile");
  await page.getByRole("button", { name: "New", exact: true }).click();
  await page.getByRole("menuitem", { name: "Add New Resume" }).click();
  await page.getByPlaceholder("Ex: Full Stack Developer").fill(title);
  await page.getByRole("button", { name: "Save" }).click();
  cleanup.resume(title);
  await expect(page.getByRole("row", { name: title }).first()).toBeVisible({
    timeout: 20000,
  });
}

function rowMenu(page: Page, title: string) {
  return page
    .getByRole("row", { name: title })
    .first()
    .getByTestId("document-actions-menu-btn");
}

async function openResume(page: Page, title: string) {
  await rowMenu(page, title).click();
  await page.getByRole("link", { name: "View/Edit Resume" }).click();
  await expect(page.getByRole("button", { name: "Add Section" })).toBeVisible();
}

async function addContactInfo(page: Page, firstName: string, lastName: string) {
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Contact Info" }).click();
  await page.getByLabel("First Name").fill(firstName);
  await page.getByLabel("Last Name").fill(lastName);
  await page.getByLabel("Headline").fill("Developer");
  await page.getByLabel("Email").fill("admin@example.com");
  await page.getByLabel("Phone").fill("123456789");
  await page.getByLabel("Address").fill("Calgary");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(
    page.getByRole("heading", { name: `${firstName} ${lastName}` }),
  ).toBeVisible({ timeout: 20000 });
}

async function addSummary(page: Page, text: string) {
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Summary" }).click();
  await page.getByLabel("Section Title").fill("Summary");
  await page.locator(".tiptap").click();
  await page.locator(".tiptap").fill(text + "\n");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText(text)).toBeVisible();
}

async function addSkill(page: Page, skill: string, cleanup: CleanupRegistry) {
  await page.getByRole("button", { name: "Add Section" }).click();
  await page.getByRole("menuitem", { name: "Add Skills" }).click();
  await page.getByRole("combobox", { name: "Search or add a skill…" }).click();
  await page.getByPlaceholder("Type a skill...").fill(skill);
  await page.getByText(`Create "${skill}"`).click();
  cleanup.tag(skill);
  await expect(page.getByText(skill, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
}

async function downloadAttachment(page: Page): Promise<Buffer> {
  const downloadButton = page.getByTitle(/^Download /);
  await expect(downloadButton).toBeVisible();
  const downloadPromise = page.waitForEvent("download");
  await downloadButton.click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  return readDownload(download);
}

test.describe("Resume files", () => {
  test("creates a resume with a PDF attached, auto-fill off", async ({
    page,
    cleanup,
  }) => {
    const title = uniqueName("Created With File");
    await page.goto("/dashboard/profile");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "New", exact: true }).click();
    await page.getByRole("menuitem", { name: "Add New Resume" }).click();
    const dialog = page.getByRole("dialog", { name: "Create Resume" });
    await expect(dialog).toBeVisible();
    // Opening runs the AI check (settings + model list fetch); once it settles
    // the switch can no longer flip on behind the test.
    await page.waitForLoadState("networkidle");

    await dialog.getByLabel("Upload Resume (Optional)").setInputFiles({
      name: "e2e-created.pdf",
      mimeType: "application/pdf",
      buffer: STUB_PDF,
    });
    const autoFill = dialog.getByRole("switch");
    if (await autoFill.isChecked()) await autoFill.click();
    await expect(autoFill).not.toBeChecked();
    await dialog.getByTestId("resume-title-input").fill(title);
    cleanup.resume(title);
    await dialog.getByRole("button", { name: "Save" }).click();

    // Auto-fill would navigate to the editor; off, the dialog closes in place.
    await expect(dialog).toBeHidden();
    await expect(page).toHaveURL(/\/dashboard\/profile$/);
    await expect(page.getByRole("row", { name: title }).first()).toBeVisible({
      timeout: 20000,
    });
    await openResume(page, title);
    expect((await downloadAttachment(page)).equals(STUB_PDF)).toBe(true);
  });

  // The edit dialog's replace branch (replaceResumeFile), not the create one.
  test("attaches a PDF to an existing resume and downloads the same bytes", async ({
    page,
    cleanup,
  }) => {
    const title = uniqueName("Upload Resume");
    await createResume(page, title, cleanup);

    await rowMenu(page, title).click();
    await page.getByRole("menuitem", { name: /Edit Resume Title/ }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Upload Resume (Optional)").setInputFiles({
      name: "e2e-resume.pdf",
      mimeType: "application/pdf",
      buffer: STUB_PDF,
    });
    await dialog.getByRole("button", { name: "Save" }).click();
    await expect(dialog).toBeHidden();

    await openResume(page, title);
    expect((await downloadAttachment(page)).equals(STUB_PDF)).toBe(true);
  });

  test("exports a resume to PDF and attaches it", async ({ page, cleanup }) => {
    const title = uniqueName("Export Resume");
    await createResume(page, title, cleanup);
    await openResume(page, title);
    await addContactInfo(page, "Pdf", "Export");
    await expect(page.getByTitle(/^Download /)).toHaveCount(0);

    // The header's menu trigger is icon-only; it sits right after Review.
    await page
      .getByRole("button", { name: "Review" })
      .locator("xpath=following-sibling::*[1]")
      .click();
    await page.getByRole("menuitem", { name: "Export to PDF" }).click();

    const dialog = page.getByRole("dialog", { name: "Export to PDF" });
    const exportButton = dialog.getByRole("button", { name: "Export" });
    // Enabled only once the preview has rendered the PDF.
    await expect(exportButton).toBeEnabled({ timeout: 30000 });
    const downloadPromise = page.waitForEvent("download");
    await exportButton.click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
    const bytes = await readDownload(download);
    expect(bytes.subarray(0, 4).toString()).toBe("%PDF");
    // With no file attached yet, the export is uploaded as the attachment.
    await expect(page.getByTitle(/^Download /)).toBeVisible({ timeout: 20000 });
  });

  test("copies a resume with its contact info and sections", async ({
    page,
    cleanup,
  }) => {
    const title = uniqueName("Source Resume");
    const copyTitle = uniqueName("Copied Resume");
    const summary = uniqueName("copied summary text");
    await createResume(page, title, cleanup);
    await openResume(page, title);
    await addContactInfo(page, "Copy", "Source");
    await addSummary(page, summary);
    // Copy needs two sections; contact info does not count.
    const skill = uniqueName("copyskill");
    await addSkill(page, skill, cleanup);

    await page.goto("/dashboard/profile");
    await rowMenu(page, title).click();
    await page.getByTestId("copy-resume-menu-item").click();
    await expect(page.getByRole("dialog", { name: "Create a copy" })).toBeVisible();
    const titleInput = page.getByTestId("copy-resume-title-input");
    // The suggested title loads first and would overwrite an early fill.
    await expect(titleInput).toBeEnabled();
    await expect(titleInput).not.toHaveValue("");
    await titleInput.fill(copyTitle);
    cleanup.resume(copyTitle);
    await page.getByRole("button", { name: "Create copy" }).click();

    await expect(page.getByRole("row", { name: copyTitle }).first()).toBeVisible({
      timeout: 20000,
    });
    await openResume(page, copyTitle);
    await expect(
      page.getByRole("heading", { name: "Copy Source" }),
    ).toBeVisible();
    await expect(page.getByText(summary)).toBeVisible();
    await expect(page.getByText(skill, { exact: true })).toBeVisible();
  });
});
