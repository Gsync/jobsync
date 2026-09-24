import { test, expect, createNewJob, uniqueName } from "./fixtures";

test("an interview stage added on a job appears on the Interviews page", async ({
  page,
  cleanup,
}) => {
  const jobTitle = uniqueName("Interview Engineer");
  const jobId = await createNewJob(page, jobTitle, cleanup);

  // The round is created where rounds are created: the job's Timeline tab.
  await page.goto(`/dashboard/myjobs/${jobId}?tab=timeline`);
  await page.getByTestId("timeline-add-stage-btn").click();
  await page.getByTestId("stage-type-select").click();
  const search = page.getByPlaceholder("Search stage");
  await search.fill("Final / Onsite Interview");
  await page
    .getByRole("option", { name: "Final / Onsite Interview", exact: true })
    .click();
  await expect(search).not.toBeVisible();
  await page.getByRole("button", { name: "Add Stage", exact: true }).click();
  await expect(page.getByRole("tab", { name: /Timeline/ })).toContainText("2");

  await page.goto("/dashboard/interviews");

  const row = page.getByRole("row", { name: new RegExp(jobTitle) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Final / Onsite Interview");

  // Expanding shows the prep-question panel for the round.
  await page
    .getByRole("button", { name: new RegExp(`Expand ${jobTitle}`) })
    .click();
  await expect(page.getByText(/Prep questions/)).toBeVisible();

  // The round menu records an outcome, and the badge follows.
  await row.getByRole("button", { name: "Toggle menu" }).click();
  await page.getByRole("menuitem", { name: "Set outcome" }).click();
  await page.getByRole("menuitem", { name: "Passed", exact: true }).click();
  await expect(
    page.getByRole("row", { name: new RegExp(jobTitle) }),
  ).toContainText("Passed");
});
