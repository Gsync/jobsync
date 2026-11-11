import {
  fetchLinkedInJob,
  fetchLinkedInSearchResults,
} from "@/lib/scraper/linkedin";
import {
  parseLinkedInJobHtml,
  parseLinkedInSearchResults,
  sanitizeLinkedInHtml,
} from "@/lib/scraper/linkedin/parse";
import {
  buildLinkedInGuestSearchUrl,
  parseLinkedInJobId,
  parseLinkedInSearchUrl,
} from "@/lib/scraper/linkedin/url";

const JOB_FRAGMENT = `
<section class="top-card-layout container-lined">
  <h2 class="top-card-layout__title font-sans text-lg topcard__title">Senior Software Engineer</h2>
  <div class="topcard__flavor-row">
    <span class="topcard__flavor">
      <a class="topcard__org-name-link topcard__flavor--black-link" href="https://de.linkedin.com/company/munich-re">Munich Re</a>
    </span>
    <span class="topcard__flavor topcard__flavor--bullet">Toronto, Ontario, Canada</span>
  </div>
  <span class="posted-time-ago__text posted-time-ago__text--new topcard__flavor--metadata">19 hours ago</span>
  <div class="description__text description__text--rich">
    <section class="show-more-less-html">
      <div class="show-more-less-html__markup show-more-less-html__markup--clamp-after-5 relative overflow-hidden">
        Location: Toronto; hybrid schedule.<br><br><strong>Job Overview:</strong><br>Build secure APIs.
        <script>alert("xss")</script>
      </div>
    </section>
  </div>
  <ul class="description__job-criteria-list">
    <li class="description__job-criteria-item">
      <h3 class="description__job-criteria-subheader">Employment type</h3>
      <span class="description__job-criteria-text description__job-criteria-text--criteria">Full-time</span>
    </li>
  </ul>
</section>`;

const SEARCH_RESULTS = `
<li>
  <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4472781721">
    <a class="base-card__full-link" href="https://ca.linkedin.com/jobs/view/senior-software-engineer-at-munich-re-4472781721?trackingId=abc">Senior Software Engineer</a>
    <h3 class="base-search-card__title">Senior Software Engineer</h3>
    <h4 class="base-search-card__subtitle"><a class="hidden-nested-link">Munich Re</a></h4>
    <span class="job-search-card__location">Toronto, Ontario, Canada</span>
    <time class="job-search-card__listdate--new" datetime="2026-11-10">19 hours ago</time>
  </div>
</li>
<li>
  <div class="base-card base-search-card job-search-card" data-entity-urn="urn:li:jobPosting:4472781722">
    <a class="base-card__full-link" href="https://www.linkedin.com/jobs/view/4472781722">Backend Engineer</a>
    <h3 class="base-search-card__title">Backend Engineer</h3>
    <h4 class="base-search-card__subtitle"><a class="hidden-nested-link">Acme</a></h4>
    <span class="job-search-card__location">Remote</span>
    <time class="job-search-card__listdate" datetime="2026-11-09">1 day ago</time>
  </div>
</li>`;

describe("LinkedIn URL parsing", () => {
  it("extracts a posting id from the common LinkedIn URL shapes", () => {
    expect(
      parseLinkedInJobId(
        "https://www.linkedin.com/jobs/view/4472781721?trackingId=abc",
      ),
    ).toBe("4472781721");
    expect(
      parseLinkedInJobId(
        "https://ca.linkedin.com/jobs/view/senior-engineer-at-munich-re-4472781721",
      ),
    ).toBe("4472781721");
    expect(
      parseLinkedInJobId(
        "https://www.linkedin.com/jobs/search/?currentJobId=4472781721",
      ),
    ).toBe("4472781721");
    expect(
      parseLinkedInJobId("www.linkedin.com/jobs/view/4472781721"),
    ).toBe("4472781721");
  });

  it("rejects non-LinkedIn and non-posting URLs", () => {
    expect(
      parseLinkedInJobId("https://example.com/jobs/view/4472781721"),
    ).toBeNull();
    expect(
      parseLinkedInJobId("https://www.linkedin.com/jobs/search/?keywords=dev"),
    ).toBeNull();
  });

  it("normalizes a search URL and forwards only supported filters", () => {
    const search = parseLinkedInSearchUrl(
      "linkedin.com/jobs/search/?keywords=product%20designer&location=Toronto&f_TPR=r604800&trk=public_jobs&start=50",
    );
    expect(search).not.toBeNull();
    expect(search?.keywords).toBe("product designer");
    expect(search?.location).toBe("Toronto");
    expect(search?.url).toBe(
      "https://www.linkedin.com/jobs/search/?f_TPR=r604800&keywords=product+designer&location=Toronto",
    );
    expect(buildLinkedInGuestSearchUrl(search!, 25)).toContain("start=25");
    expect(buildLinkedInGuestSearchUrl(search!, 25)).toContain(
      "keywords=product+designer",
    );
  });

  it("rejects search URLs with no criteria", () => {
    expect(
      parseLinkedInSearchUrl("https://www.linkedin.com/jobs/search/"),
    ).toBeNull();
    expect(
      parseLinkedInSearchUrl("https://www.linkedin.com/jobs/view/4472781721"),
    ).toBeNull();
  });
});

describe("LinkedIn HTML parsing", () => {
  it("parses a public posting fragment", () => {
    const job = parseLinkedInJobHtml(JOB_FRAGMENT, "4472781721");
    expect(job).not.toBeNull();
    expect(job).toMatchObject({
      id: "4472781721",
      url: "https://www.linkedin.com/jobs/view/4472781721",
      title: "Senior Software Engineer",
      company: "Munich Re",
      location: "Toronto, Ontario, Canada",
      employmentType: "Full-time",
      workplaceType: "Hybrid",
      postedDate: "19 hours ago",
    });
    expect(job?.descriptionText).toContain("Build secure APIs.");
    expect(job?.descriptionHtml).not.toContain("<script");
    expect(job?.descriptionHtml).not.toContain("alert");
  });

  it("removes active content from description HTML", () => {
    const sanitized = sanitizeLinkedInHtml(
      '<p onclick="evil()">Hello <script>alert(1)</script><a href="javascript:evil()">link</a><img src=x onerror="evil()"></p>',
    );
    expect(sanitized).toContain("<p>Hello");
    expect(sanitized).toContain("<a href=\"#\">link</a>");
    expect(sanitized).not.toContain("onclick");
    expect(sanitized).not.toContain("onerror");
    expect(sanitized).not.toContain("javascript:");
    expect(sanitized).not.toContain("<script");
    expect(sanitized).not.toContain("<img");
  });

  it("parses search result cards and deduplicates by posting id", () => {
    const results = parseLinkedInSearchResults(
      SEARCH_RESULTS + SEARCH_RESULTS,
    );
    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      id: "4472781721",
      url: "https://www.linkedin.com/jobs/view/4472781721",
      title: "Senior Software Engineer",
      company: "Munich Re",
      location: "Toronto, Ontario, Canada",
      postedDate: "2026-11-10",
    });
    expect(results[1].title).toBe("Backend Engineer");
    expect(results[1].location).toBe("Remote");
  });
});

describe("LinkedIn fetch wrapper", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches a posting through the guest endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JOB_FRAGMENT,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchLinkedInJob(
      "https://www.linkedin.com/jobs/view/4472781721",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Senior Software Engineer");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/jobs-guest/jobs/api/jobPosting/4472781721"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("reports a blocked response without leaking the HTML", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 999,
        text: async () => "blocked",
      }),
    );

    const result = await fetchLinkedInJob(
      "https://www.linkedin.com/jobs/view/4472781721",
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("blocked");
    }
  });

  it("fetches a page of search results", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => SEARCH_RESULTS,
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchLinkedInSearchResults(
      "https://www.linkedin.com/jobs/search/?keywords=engineer&location=Toronto",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.results).toHaveLength(2);
      expect(result.data.nextStart).toBeNull();
    }
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/jobs-guest/jobs/api/seeMoreJobPostings/search"),
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it("reports an auth wall as blocked", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => "<html>Sign in to view</html>",
      }),
    );

    const result = await fetchLinkedInSearchResults(
      "https://www.linkedin.com/jobs/search/?keywords=engineer",
    );

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("blocked");
    }
  });
});
