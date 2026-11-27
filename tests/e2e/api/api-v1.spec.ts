import {
  test,
  expect,
  createAccessToken,
  uniqueName,
} from "../fixtures";

const TOKEN_BASE = "e2e api v1 token";

// Drives the public API over real HTTP with a token minted in Settings. The
// `request` fixture carries no session cookie, so only the token authenticates.
test.describe("Public API v1", () => {
  test("pings, creates a job, and refuses the same posting as a duplicate", async ({
    page,
    request,
    cleanup,
  }) => {
    const { name, token } = await createAccessToken(page, cleanup, TOKEN_BASE);
    const headers = { Authorization: `Bearer ${token}` };

    const ping = await request.get("/api/v1/ping", { headers });
    expect(ping.status()).toBe(200);
    expect(await ping.json()).toMatchObject({
      app: "jobsync",
      tokenName: name,
      scopes: expect.arrayContaining(["jobs:write"]),
    });

    const jobTitle = uniqueName("api v1 job title");
    const company = uniqueName("api v1 company");
    const location = uniqueName("api v1 location");
    const body = {
      company,
      jobTitle,
      location,
      jobUrl: `https://example.com/jobs/${encodeURIComponent(jobTitle)}`,
      jobDescription: "Build and maintain the core platform end to end.",
    };

    const created = await request.post("/api/v1/jobs", { headers, data: body });
    expect(created.status()).toBe(201);
    const createdBody = await created.json();
    cleanup.job(createdBody.jobId);
    cleanup.title(jobTitle);
    cleanup.company(company);
    cleanup.location(location);
    expect(createdBody).toMatchObject({
      created: true,
      jobPath: `/dashboard/myjobs/${createdBody.jobId}`,
    });

    const duplicate = await request.post("/api/v1/jobs", { headers, data: body });
    expect(duplicate.status()).toBe(409);
    expect(await duplicate.json()).toMatchObject({
      created: false,
      duplicateOf: { id: createdBody.jobId },
    });

    await page.goto(createdBody.jobPath);
    await expect(page.getByText(jobTitle).first()).toBeVisible();
  });

  test("rejects a body missing required fields with per-field issues", async ({
    page,
    request,
    cleanup,
  }) => {
    const { token } = await createAccessToken(page, cleanup, TOKEN_BASE);

    const res = await request.post("/api/v1/jobs", {
      headers: { Authorization: `Bearer ${token}` },
      data: { jobTitle: uniqueName("api v1 no company") },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
    expect(body.issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: "company" })]),
    );
  });

  test("rejects an unknown token", async ({ request }) => {
    const headers = { Authorization: "Bearer jsync_not-a-real-token" };

    expect((await request.get("/api/v1/ping", { headers })).status()).toBe(401);
    const res = await request.post("/api/v1/jobs", {
      headers,
      data: { company: "Nobody", jobTitle: "Nothing" },
    });
    expect(res.status()).toBe(401);
  });
});
