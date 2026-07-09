import { test as base, expect, type Page } from "@playwright/test";
import { randomUUID } from "crypto";

// Unique per invocation so each test's job/company/location/title rows never
// collide with another run's leftovers — the basis for test isolation.
export function uniqueName(base: string): string {
  return `${base} ${randomUUID().slice(0, 8)}`;
}

export async function login(page: Page) {
  await page.getByPlaceholder("id@example.com").click();
  await page.getByPlaceholder("id@example.com").fill("admin@example.com");
  await page.getByRole("textbox", { name: "Password" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill("password123");
  await page.getByRole("button", { name: "Login" }).click();
}

// Fills a "search or create" combobox and picks the entry. Unique names mean
// the Create option is the expected path; the existing-option branch is a
// fallback for the rare case a prior run leaked the row.
export async function selectOrCreate(
  page: Page,
  label: string,
  placeholder: string,
  value: string,
) {
  await page.getByLabel(label).click();
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(value);
  const createOption = page.getByText(`Create: ${value}`);
  const existingOption = page.getByRole("option", { name: value, exact: true });
  // Deterministic wait for the filtered list instead of a fixed timeout.
  await expect(createOption.or(existingOption).first()).toBeVisible();
  if (await existingOption.isVisible()) {
    await existingOption.click();
  } else {
    await createOption.click();
  }
  // The popover closes only once the selection (or the create server action,
  // which runs inside a React transition) commits the field value. Wait on
  // that — not the trigger label, which can render blank after a create
  // because ComboBox mutates its options prop in place, so options.find()
  // may miss the new row even though field.value is set correctly.
  await expect(input).not.toBeVisible({ timeout: 15000 });
}

export async function createNewJob(
  page: Page,
  jobText: string,
  cleanup: CleanupRegistry,
  options?: {
    skipUrl?: boolean;
    beforeSave?: (page: Page) => Promise<void>;
    company?: string;
    location?: string;
  },
): Promise<string> {
  const suffix = jobText.replace(/\s+/g, "-");
  const companyText = options?.company ?? `company ${suffix}`;
  const locationText = options?.location ?? `location ${suffix}`;

  await page.getByRole("button", { name: "New Job" }).click();
  await expect(page).toHaveURL(/\/dashboard\/myjobs/);
  // Dashboard's "New Job" button auto-opens the dialog via ?add-job=true.
  await expect(page.getByTestId("add-job-dialog-title")).toBeVisible();
  if (!options?.skipUrl) {
    await page
      .getByPlaceholder("Copy and paste job link here")
      .fill("www.google.com");
  }

  // Register each Library item the moment it's persisted (the "Create" click
  // saves it via its own server action), so a failure before the job is saved
  // still tears the item down.
  await selectOrCreate(page, "Job Title", "Create or Search title", jobText);
  cleanup.title(jobText);
  await selectOrCreate(page, "Company", "Create or Search company", companyText);
  cleanup.company(companyText);
  await selectOrCreate(
    page,
    "Job Location",
    "Create or Search location",
    locationText,
  );
  cleanup.location(locationText);

  await page.getByText("Part-time").click();
  await page.getByLabel("Job Source").click();
  await page.getByRole("option", { name: "Indeed" }).click();
  await expect(page.getByLabel("Job Source")).toContainText("Indeed");
  await page.getByLabel("Job Description").locator("div").click();
  await page
    .getByLabel("Job Description")
    .locator("div")
    .fill("test description");
  if (options?.beforeSave) {
    await options.beforeSave(page);
  }
  await page.getByTestId("save-job-btn").click();

  // Register the saved job for deletion, and return its id (from the row link)
  // in case a test needs it. Names are unique per run, so .first() is just
  // belt-and-suspenders.
  const row = page.getByRole("row", { name: jobText }).first();
  await expect(row).toBeVisible();
  const href = await row
    .getByRole("link", { name: jobText })
    .getAttribute("href");
  const jobId = href!.split("/").pop()!;
  cleanup.job(jobId);
  return jobId;
}

// Records the ids/names a test creates so they can be torn down after the
// test, pass or fail, via the test-only cleanup API.
export type CleanupRegistry = {
  job: (id: string) => void;
  resume: (title: string) => void;
  task: (title: string) => void;
  title: (name: string) => void;
  company: (name: string) => void;
  location: (name: string) => void;
  activityType: (name: string) => void;
  tag: (name: string) => void;
  mcpToken: (name: string) => void;
};

type Fixtures = {
  cleanup: CleanupRegistry;
};

export const test = base.extend<Fixtures>({
  // Auto-login every test and land on the dashboard.
  page: async ({ page, baseURL }, use) => {
    await page.goto("/");
    await login(page);
    await expect(page).toHaveURL(baseURL + "/dashboard");
    await use(page);
  },
  cleanup: async ({ page }, use) => {
    const jobIds: string[] = [];
    const resumes: string[] = [];
    const tasks: string[] = [];
    const titles: string[] = [];
    const companies: string[] = [];
    const locations: string[] = [];
    const activityTypes: string[] = [];
    const tags: string[] = [];
    const mcpTokens: string[] = [];
    await use({
      job: (id) => jobIds.push(id),
      resume: (title) => resumes.push(title),
      task: (title) => tasks.push(title),
      title: (name) => titles.push(name),
      company: (name) => companies.push(name),
      location: (name) => locations.push(name),
      activityType: (name) => activityTypes.push(name),
      tag: (name) => tags.push(name),
      mcpToken: (name) => mcpTokens.push(name),
    });
    // page.request carries the session cookie; page is still alive here
    // because cleanup tears down before the page fixture.
    const res = await page.request.post("/api/test/cleanup", {
      data: {
        jobIds,
        resumes,
        tasks,
        titles,
        companies,
        locations,
        activityTypes,
        tags,
        mcpTokens,
      },
    });
    if (!res.ok()) {
      console.warn(`Cleanup request failed: ${res.status()}`);
    }
  },
});

export { expect };
