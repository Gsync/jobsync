import { getExistingJobDedupeMap, findExistingJobByUrl } from "@/lib/jobs/jobDedupe";
import { jobDedupeKey } from "@/lib/scraper/utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

vi.mock("@prisma/client", () => {
  const m = { job: { findMany: vi.fn(), findFirst: vi.fn() } };
  return { PrismaClient: vi.fn(function () { return m; }) };
});

// Shape a DB row the way getExistingJobDedupeMap selects it.
function row(over: Partial<{
  id: string;
  jobUrl: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
}> = {}) {
  return {
    id: over.id ?? "job-1",
    jobUrl: over.jobUrl ?? null,
    JobTitle: over.title === null ? null : { label: over.title ?? "Frontend Engineer" },
    Company: over.company === null ? null : { label: over.company ?? "Acme" },
    Location: over.location === null ? null : { label: over.location ?? "Remote" },
  };
}

function mockJobs(rows: ReturnType<typeof row>[]) {
  (prisma.job.findMany as any).mockResolvedValue(rows);
}

// Simulates the add_job Tier 1 lookup: seed the user's jobs, build the map,
// then probe it with a candidate's canonical key.
async function lookupByUrl(rows: ReturnType<typeof row>[], url: string) {
  mockJobs(rows);
  const map = await getExistingJobDedupeMap("user-1");
  return map.get(jobDedupeKey({ url }));
}

describe("getExistingJobDedupeMap", () => {
  beforeEach(() => (prisma.job.findMany as any).mockReset());

  it("returns an empty map when the user has no jobs", async () => {
    mockJobs([]);
    const map = await getExistingJobDedupeMap("user-1");
    expect(map.size).toBe(0);
  });

  it("scopes the query to the given user", async () => {
    mockJobs([]);
    await getExistingJobDedupeMap("user-42");
    expect((prisma.job.findMany as any).mock.calls[0][0].where).toEqual({
      userId: "user-42",
    });
  });

  it("keys URL-bearing jobs by URL and exposes their identity", async () => {
    mockJobs([row({ id: "j1", jobUrl: "https://ex.com/jobs/1", title: "Engineer", company: "Acme" })]);
    const hit = await lookupByUrl(
      [row({ id: "j1", jobUrl: "https://ex.com/jobs/1", title: "Engineer", company: "Acme" })],
      "https://ex.com/jobs/1",
    );
    expect(hit).toEqual({ id: "j1", title: "Engineer", company: "Acme" });
  });

  it("keeps the first job when two rows collapse to the same key", async () => {
    mockJobs([
      row({ id: "first", jobUrl: "https://ex.com/jobs/1" }),
      row({ id: "second", jobUrl: "https://www.ex.com/jobs/1/?utm_source=x" }),
    ]);
    const map = await getExistingJobDedupeMap("user-1");
    expect(map.size).toBe(1);
    expect(map.get(jobDedupeKey({ url: "https://ex.com/jobs/1" }))?.id).toBe("first");
  });

  it("does not crash on null title/company/location", async () => {
    mockJobs([row({ id: "j1", jobUrl: null, title: null, company: null, location: null })]);
    const map = await getExistingJobDedupeMap("user-1");
    expect(map.size).toBe(1);
    const [ref] = [...map.values()];
    expect(ref).toEqual({ id: "j1", title: "", company: "" });
  });
});

describe("add_job Tier 1 URL matching via the dedupe map", () => {
  beforeEach(() => (prisma.job.findMany as any).mockReset());

  const existing = [row({ id: "existing", jobUrl: "https://job-boards.greenhouse.io/acme/jobs/1" })];

  it.each([
    ["exact", "https://job-boards.greenhouse.io/acme/jobs/1"],
    ["trailing slash", "https://job-boards.greenhouse.io/acme/jobs/1/"],
    ["www prefix", "https://www.job-boards.greenhouse.io/acme/jobs/1"],
    ["host case", "https://Job-Boards.Greenhouse.io/acme/jobs/1"],
    ["tracking param", "https://job-boards.greenhouse.io/acme/jobs/1?gh_src=abc&utm_source=li"],
    ["fragment", "https://job-boards.greenhouse.io/acme/jobs/1#apply"],
  ])("flags a duplicate for a %s variant", async (_label, url) => {
    const hit = await lookupByUrl(existing, url);
    expect(hit?.id).toBe("existing");
  });

  it.each([
    ["different path", "https://job-boards.greenhouse.io/acme/jobs/2"],
    ["meaningful query differs", "https://job-boards.greenhouse.io/acme/jobs/1?jid=99"],
    ["different host", "https://boards.lever.co/acme/jobs/1"],
  ])("does NOT flag %s as a duplicate", async (_label, url) => {
    const hit = await lookupByUrl(existing, url);
    expect(hit).toBeUndefined();
  });

  it("preserves an order-independent query as the same job", async () => {
    const withQuery = [row({ id: "q", jobUrl: "https://ex.com/j/1?a=1&b=2" })];
    const hit = await lookupByUrl(withQuery, "https://ex.com/j/1?b=2&a=1");
    expect(hit?.id).toBe("q");
  });

  it("falls back to raw string for an unparseable URL (no false positive)", async () => {
    mockJobs([row({ id: "j1", jobUrl: "https://ex.com/j/1" })]);
    const hit = await lookupByUrl([row({ id: "j1", jobUrl: "https://ex.com/j/1" })], "not a url");
    expect(hit).toBeUndefined();
  });
});

describe("findExistingJobByUrl", () => {
  beforeEach(() => {
    (prisma.job.findMany as any).mockReset();
    (prisma.job.findFirst as any).mockReset().mockResolvedValue(null);
  });

  it("returns null when the user has no jobs", async () => {
    mockJobs([]);
    const hit = await findExistingJobByUrl("user-1", "https://ex.com/j/1");
    expect(hit).toBeNull();
  });

  it("tries an indexed exact match before scanning", async () => {
    (prisma.job.findFirst as any).mockResolvedValue(
      row({ id: "j1", jobUrl: "https://ex.com/j/1", title: "Engineer", company: "Acme" }),
    );

    const hit = await findExistingJobByUrl("user-1", "https://ex.com/j/1");

    expect(hit).toEqual({ id: "j1", title: "Engineer", company: "Acme" });
    expect(prisma.job.findMany).not.toHaveBeenCalled();
  });

  it("scopes the exact-match query to the given user and normalized URL", async () => {
    mockJobs([]);
    await findExistingJobByUrl("user-42", "https://ex.com/j/1/?utm_source=li");
    expect((prisma.job.findFirst as any).mock.calls[0][0].where).toEqual({
      userId: "user-42",
      jobUrl: "https://ex.com/j/1",
    });
  });

  it("falls back to scanning and scopes to the given user, excluding null jobUrls", async () => {
    mockJobs([]);
    await findExistingJobByUrl("user-42", "https://ex.com/j/1");
    expect((prisma.job.findMany as any).mock.calls[0][0].where).toEqual({
      userId: "user-42",
      jobUrl: { not: null },
    });
  });

  it("falls back to a scan and finds a match by identity", async () => {
    mockJobs([
      row({ id: "j1", jobUrl: "https://ex.com/j/1", title: "Engineer", company: "Acme" }),
    ]);

    const hit = await findExistingJobByUrl("user-1", "https://ex.com/j/1");

    expect(hit).toEqual({ id: "j1", title: "Engineer", company: "Acme" });
  });

  it("falls back to a scan and matches a canonical URL variant (www + host case)", async () => {
    mockJobs([row({ id: "j1", jobUrl: "https://ex.com/j/1" })]);

    const hit = await findExistingJobByUrl(
      "user-1",
      "https://Www.Ex.com/j/1",
    );

    expect(hit?.id).toBe("j1");
  });

  it("returns null when no job matches the URL", async () => {
    mockJobs([row({ id: "j1", jobUrl: "https://ex.com/j/1" })]);

    const hit = await findExistingJobByUrl("user-1", "https://ex.com/j/2");

    expect(hit).toBeNull();
  });
});

describe("meta-key fallback (jobs without a URL)", () => {
  beforeEach(() => (prisma.job.findMany as any).mockReset());

  it("matches a URL-less job by title|company|location signature", async () => {
    mockJobs([row({ id: "m1", jobUrl: null, title: "Staff Engineer", company: "Acme", location: "Remote" })]);
    const map = await getExistingJobDedupeMap("user-1");
    const hit = map.get(
      jobDedupeKey({ title: "staff engineer", company: "ACME", location: "remote" }),
    );
    expect(hit?.id).toBe("m1");
  });

  it("treats a different location as a different job", async () => {
    mockJobs([row({ id: "m1", jobUrl: null, title: "Staff Engineer", company: "Acme", location: "Remote" })]);
    const map = await getExistingJobDedupeMap("user-1");
    const hit = map.get(
      jobDedupeKey({ title: "Staff Engineer", company: "Acme", location: "New York" }),
    );
    expect(hit).toBeUndefined();
  });

  it("does not cross-match a URL job against a meta key", async () => {
    mockJobs([row({ id: "u1", jobUrl: "https://ex.com/j/1", title: "Staff Engineer", company: "Acme", location: "Remote" })]);
    const map = await getExistingJobDedupeMap("user-1");
    const hit = map.get(jobDedupeKey({ title: "Staff Engineer", company: "Acme", location: "Remote" }));
    expect(hit).toBeUndefined();
  });
});
