import { fetchLeverBoardJobs, searchLeverJobs } from "@/lib/scraper/lever";
import { mapLeverJob } from "@/lib/scraper/lever/mapper";
import { normalizeWorkplaceType } from "@/lib/scraper/mapper";
import { APP_CONSTANTS } from "@/lib/constants";
import type { LeverPosting } from "@/lib/scraper/lever/types";

const LIMIT = APP_CONSTANTS.LEVER_PAGE_LIMIT;

function posting(id: string, overrides: Partial<LeverPosting> = {}): LeverPosting {
  return {
    id,
    text: `Job ${id}`,
    hostedUrl: `https://jobs.lever.co/acme/${id}`,
    ...overrides,
  };
}

// Builds a page of n distinct postings whose lead id is `leadId`.
function page(leadId: string, n: number): LeverPosting[] {
  return Array.from({ length: n }, (_, i) =>
    posting(i === 0 ? leadId : `${leadId}-${i}`),
  );
}

function okJson(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe("fetchLeverBoardJobs pagination", () => {
  afterEach(() => vi.restoreAllMocks());

  it("single short page → one request, stops", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson([posting("a"), posting("b")]));

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(2);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("full page then a short page → two requests, concatenated", async () => {
    let call = 0;
    const spy = vi.spyOn(global, "fetch").mockImplementation(() => {
      call++;
      return Promise.resolve(
        call === 1 ? okJson(page("p1", LIMIT)) : okJson(page("p2", 3)),
      );
    });

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data).toHaveLength(LIMIT + 3);
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it("repeated full page with a NEW lead id each time → stops at LEVER_MAX_PAGES", async () => {
    let call = 0;
    const spy = vi.spyOn(global, "fetch").mockImplementation(() => {
      call++;
      return Promise.resolve(okJson(page(`page${call}`, LIMIT)));
    });

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(spy).toHaveBeenCalledTimes(APP_CONSTANTS.LEVER_MAX_PAGES);
    expect(result.data).toHaveLength(LIMIT * APP_CONSTANTS.LEVER_MAX_PAGES);
  });

  it("repeated full page with the SAME lead id (skip ignored) → guard stops after 2 requests", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson(page("same", LIMIT)));

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(true);
    if (!result.success) return;
    // Page 1 accepted (LIMIT rows), page 2 detected as a repeat → break.
    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(LIMIT);
  });

  it("non-200 mid-loop → board fails (all-or-nothing)", async () => {
    let call = 0;
    vi.spyOn(global, "fetch").mockImplementation(() => {
      call++;
      return Promise.resolve(
        call === 1 ? okJson(page("p1", LIMIT)) : okJson({}, 500),
      );
    });

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("network");
  });

  it("429 mid-loop → rate_limited error (not network)", async () => {
    let call = 0;
    vi.spyOn(global, "fetch").mockImplementation(() => {
      call++;
      return Promise.resolve(
        call === 1 ? okJson(page("p1", LIMIT)) : okJson({}, 429),
      );
    });

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("rate_limited");
  });

  it("AbortError → timed out error", async () => {
    vi.spyOn(global, "fetch").mockRejectedValue(
      Object.assign(new Error("aborted"), { name: "AbortError" }),
    );

    const result = await fetchLeverBoardJobs("Acme", "acme");
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.type).toBe("network");
    if (result.error.type === "network") {
      expect(result.error.message).toContain("timed out");
    }
  });

  it("host 'eu' hits the EU base URL; default host uses the default base URL", async () => {
    const spy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(okJson([posting("a")]));

    await fetchLeverBoardJobs("Acme", "acme", "eu");
    expect(String(spy.mock.calls[0][0])).toContain(
      APP_CONSTANTS.LEVER_EU_BASE_URL,
    );

    spy.mockClear();
    await fetchLeverBoardJobs("Acme", "acme");
    expect(String(spy.mock.calls[0][0])).toContain(APP_CONSTANTS.LEVER_BASE_URL);
    expect(String(spy.mock.calls[0][0])).not.toContain(
      APP_CONSTANTS.LEVER_EU_BASE_URL,
    );
  });
});

describe("searchLeverJobs", () => {
  afterEach(() => vi.restoreAllMocks());

  it("isolates a bad board: others still return", async () => {
    vi.spyOn(global, "fetch").mockImplementation((input) => {
      const url = String(input);
      if (url.includes("/postings/good")) {
        return Promise.resolve(okJson([posting("g1")]));
      }
      return Promise.resolve(okJson({}, 404));
    });

    const { jobs, errors } = await searchLeverJobs([
      { name: "Good", token: "good" },
      { name: "Bad", token: "bad" },
    ]);
    expect(jobs).toHaveLength(1);
    expect(errors).toHaveLength(1);
    expect(errors[0].token).toBe("bad");
  });
});

describe("mapLeverJob", () => {
  it("builds description from descriptionPlain + flattened lists + additionalPlain, converts epoch ms to ISO, carries company name", () => {
    const created = Date.UTC(2026, 0, 15);
    const mapped = mapLeverJob(
      posting("x", {
        text: "  Staff Engineer ",
        createdAt: created,
        // Lever repeats the opening inside descriptionPlain, so it must not be
        // concatenated twice.
        openingPlain: "Body",
        descriptionPlain: "Body",
        lists: [
          { text: "What You'll Do", content: "<ul><li>Ship &amp; scale</li></ul>" },
          { text: "Who You Are", content: "<p>5+ years</p>" },
        ],
        additionalPlain: "Extra",
        categories: {
          commitment: "Full-time",
          allLocations: ["Berlin", "Remote - EU"],
        },
      }),
      "Acme Corp",
    );

    expect(mapped.title).toBe("Staff Engineer");
    expect(mapped.company).toBe("Acme Corp");
    // Opening appears once (not duplicated); the lists body — absent from every
    // plain field — is flattened and included.
    expect(mapped.description).toBe(
      "Body\n\nWhat You'll Do\nShip & scale\n\nWho You Are\n5+ years\n\nExtra",
    );
    expect(mapped.postedDate).toBe(new Date(created).toISOString());
    expect(mapped.employmentType).toBe("Full-time");
  });

  it("falls back to openingPlain when descriptionPlain is absent", () => {
    const mapped = mapLeverJob(
      posting("x", { openingPlain: "Intro only" }),
      "Acme",
    );
    expect(mapped.description).toBe("Intro only");
  });

  it("joins all of allLocations, not just the first", () => {
    const mapped = mapLeverJob(
      posting("x", {
        categories: { allLocations: ["Berlin", "London", "Remote"] },
      }),
      "Acme",
    );
    expect(mapped.location).toBe("Berlin, London, Remote");
  });

  it("falls back to categories.location when allLocations is absent", () => {
    const mapped = mapLeverJob(
      posting("x", { categories: { location: "Toronto" } }),
      "Acme",
    );
    expect(mapped.location).toBe("Toronto");
  });

  it("maps workplaceType full-fidelity", () => {
    const wp = (raw?: string) =>
      mapLeverJob(posting("x", { workplaceType: raw }), "Acme").workplaceType;
    expect(wp("remote")).toBe("REMOTE");
    expect(wp("hybrid")).toBe("HYBRID");
    expect(wp("on-site")).toBe("ONSITE");
    expect(wp("onsite")).toBe("ONSITE");
    expect(wp("weird")).toBeUndefined();
    expect(wp(undefined)).toBeUndefined();
  });

  it("no postedDate when createdAt is absent", () => {
    const mapped = mapLeverJob(posting("x"), "Acme");
    expect(mapped.postedDate).toBeUndefined();
  });
});

describe("workplace precedence in normalizeWorkplaceType (regression)", () => {
  it("JSearch boolean path unchanged", () => {
    expect(normalizeWorkplaceType(true)).toBe("REMOTE");
    expect(normalizeWorkplaceType(false)).toBeNull();
    expect(normalizeWorkplaceType(undefined)).toBeNull();
  });
});
