import {
  flattenHtml,
  fetchBoardJobs,
  searchGreenhouseJobs,
} from "@/lib/scraper/greenhouse";
import fixture from "./fixtures/greenhouse-anthropic.json";

describe("flattenHtml", () => {
  it("decodes entity-encoded HTML and strips tags", () => {
    const raw =
      "&lt;div class=&quot;intro&quot;&gt;&lt;p&gt;Hello &amp; welcome&lt;/p&gt;&lt;/div&gt;";
    expect(flattenHtml(raw)).toBe("Hello & welcome");
  });

  it("decodes numeric entities and smart quotes", () => {
    expect(flattenHtml("Anthropic&#39;s mission")).toBe("Anthropic's mission");
  });

  it("collapses whitespace", () => {
    expect(flattenHtml("&lt;p&gt;a&lt;/p&gt;\n\n&lt;p&gt;b&lt;/p&gt;")).toBe(
      "a b",
    );
  });

  it("returns empty string for empty input", () => {
    expect(flattenHtml("")).toBe("");
  });
});

describe("fetchBoardJobs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps Greenhouse fields from a real board response", async () => {
    const sample = { jobs: (fixture as { jobs: unknown[] }).jobs.slice(0, 5) };
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => sample,
    } as Response);

    const result = await fetchBoardJobs("anthropic");
    expect(result.success).toBe(true);
    if (!result.success) return;

    const first = result.data[0];
    expect(first.title.length).toBeGreaterThan(0);
    expect(first.company).toBe("Anthropic");
    expect(first.location.length).toBeGreaterThan(0);
    expect(first.url).toContain("greenhouse.io");
    expect(first.description).not.toContain("&lt;");
    // descriptions are now stored as decoded HTML (real tags, no entity encoding)
    expect(first.description.length).toBeGreaterThan(0);
    expect(first.postedDate).toBeTruthy();
  });

  it("returns a network error on 404", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({}),
    } as Response);

    const result = await fetchBoardJobs("badtoken");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("network");
  });

  it("returns a network error on timeout (abort)", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );

    const result = await fetchBoardJobs("slowboard");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("network");
    if (result.error.type === "network") {
      expect(result.error.message).toContain("timed out");
    }
  });
});

describe("searchGreenhouseJobs", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("isolates a bad board: others still return", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/good/")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            jobs: [
              {
                title: "Engineer",
                company_name: "Good Co",
                location: { name: "Remote" },
                absolute_url: "https://example.com/1",
                content: "&lt;p&gt;hi&lt;/p&gt;",
                first_published: "2026-01-01T00:00:00Z",
              },
            ],
          }),
        } as Response);
      }
      return Promise.resolve({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as Response);
    });

    const { jobs, errors } = await searchGreenhouseJobs([
      { name: "Good", token: "good" },
      { name: "Bad", token: "bad" },
    ]);

    expect(jobs).toHaveLength(1);
    expect(jobs[0].company).toBe("Good Co");
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("bad");
  });
});
