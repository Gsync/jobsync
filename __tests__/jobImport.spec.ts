import {
  detectJobUrl,
  parseImportUrl,
  resolveJobFromUrl,
} from "@/lib/scraper/import";
import { fetchImportPage } from "@/lib/scraper/import/http";
import { extractJobFromHtml } from "@/lib/scraper/import/jsonld";
import { sanitizeJobHtml } from "@/lib/scraper/html";
import { afterEach, describe, expect, it, vi } from "vitest";

function response(
  body: string,
  status = 200,
  headers: Record<string, string> = {},
) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    text: async () => body,
  };
}

function json(value: unknown) {
  return response(JSON.stringify(value));
}

function jsonLd(value: unknown) {
  // Escape the closing tag inside JSON strings, the way real JSON-LD
  // generators do, so a description containing markup cannot end the block.
  const json = JSON.stringify(value).replace(/<\/script/gi, "<\\/script");
  return `<script type="application/ld+json">${json}</script>`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("job import URL detection", () => {
  it("detects LinkedIn posting URLs", () => {
    expect(
      detectJobUrl("https://www.linkedin.com/jobs/view/1234567890"),
    ).toEqual({ provider: "linkedin" });
  });

  it("detects Greenhouse public, embed and API URLs", () => {
    expect(
      detectJobUrl("https://job-boards.greenhouse.io/acme/jobs/123456"),
    ).toEqual({ provider: "greenhouse", token: "acme", id: "123456" });
    expect(
      detectJobUrl("https://boards.greenhouse.io/acme/jobs/123456?gh_src=x"),
    ).toEqual({ provider: "greenhouse", token: "acme", id: "123456" });
    expect(
      detectJobUrl(
        "https://boards.greenhouse.io/embed/job_app?for=acme&token=123456",
      ),
    ).toEqual({ provider: "greenhouse", token: "acme", id: "123456" });
    expect(
      detectJobUrl(
        "https://boards-api.greenhouse.io/v1/boards/acme/jobs/123456",
      ),
    ).toEqual({ provider: "greenhouse", token: "acme", id: "123456" });
  });

  it("detects Lever and Ashby URLs, including Lever EU", () => {
    expect(
      detectJobUrl("https://jobs.lever.co/acme/abcdef12-3456"),
    ).toEqual({
      provider: "lever",
      token: "acme",
      id: "abcdef12-3456",
      eu: false,
    });
    expect(
      detectJobUrl("https://jobs.eu.lever.co/acme/abcdef12-3456"),
    ).toEqual({
      provider: "lever",
      token: "acme",
      id: "abcdef12-3456",
      eu: true,
    });
    expect(
      detectJobUrl("https://jobs.ashbyhq.com/acme/abcdef12-3456"),
    ).toEqual({ provider: "ashby", token: "acme", id: "abcdef12-3456" });
  });

  it("falls back to the generic parser for other sites", () => {
    expect(detectJobUrl("https://careers.example.com/jobs/123")).toEqual({
      provider: "generic",
    });
  });

  it("rejects invalid and credential-bearing URLs", () => {
    expect(parseImportUrl("")).toBeNull();
    expect(parseImportUrl("ftp://example.com/job")).toBeNull();
    expect(parseImportUrl("https://user:pass@example.com/job")).toBeNull();
    expect(detectJobUrl("not a url")).toBeNull();
  });
});

describe("sanitizeJobHtml", () => {
  it("removes scripts, handlers and javascript URLs in either quoting style", () => {
    const cleaned = sanitizeJobHtml(
      '<p onclick="evil()">Keep</p><script>alert(1)</script>' +
        '<a href="javascript:alert(1)">one</a><a href=javascript:alert(2)>two</a>' +
        '<a href="https://example.com">link</a>',
    );

    expect(cleaned).toContain("Keep");
    expect(cleaned).not.toContain("onclick");
    expect(cleaned).not.toContain("<script");
    expect(cleaned).not.toContain("javascript:");
    expect(cleaned).toContain('href="https://example.com"');
  });
});

describe("JSON-LD extraction", () => {
  const posting = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: "Senior Platform Engineer",
    hiringOrganization: { "@type": "Organization", name: "Globex" },
    jobLocation: {
      "@type": "Place",
      address: {
        addressLocality: "Toronto",
        addressRegion: "ON",
        addressCountry: "Canada",
      },
    },
    employmentType: "FULL_TIME",
    datePosted: "2026-11-01",
    jobLocationType: "TELECOMMUTE",
    baseSalary: {
      "@type": "MonetaryAmount",
      currency: "USD",
      value: { minValue: 120000, maxValue: 150000, unitText: "YEAR" },
    },
    description:
      '<p>Build the platform.</p><script>alert("xss")</script><p>Remote role.</p>',
  };

  it("extracts the common JobPosting fields", () => {
    const result = extractJobFromHtml(
      `<html><head>${jsonLd(posting)}</head><body></body></html>`,
      "https://careers.example.com/jobs/123",
    );

    expect(result.title).toBe("Senior Platform Engineer");
    expect(result.company).toBe("Globex");
    expect(result.location).toBe("Toronto, ON, Canada");
    expect(result.employmentType).toBe("FULL_TIME");
    expect(result.workplaceType).toBe("Remote");
    expect(result.salary).toBe("$120,000 - $150,000");
    expect(result.postedDate).toBe("2026-11-01");
    expect(result.descriptionHtml).toContain("Build the platform.");
  });

  it("finds a JobPosting inside an @graph array", () => {
    const result = extractJobFromHtml(
      jsonLd({
        "@context": "https://schema.org",
        "@graph": [{ "@type": "Organization", name: "Globex" }, posting],
      }),
      "https://careers.example.com/jobs/123",
    );

    expect(result.title).toBe("Senior Platform Engineer");
    expect(result.company).toBe("Globex");
  });

  it("reads JSON-LD that contains literal newlines inside strings", () => {
    const html = [
      '<html><head><script type="application/ld+json">',
      '{"@type":"JobPosting","title":"Podcast Manager",',
      '"hiringOrganization":{"name":"PodcastHub"},',
      '"description":"<p>First line\nSecond line</p>"}',
      "</script></head></html>",
    ].join("");

    const result = extractJobFromHtml(html, "https://example.com/jobs/1");

    expect(result.title).toBe("Podcast Manager");
    expect(result.company).toBe("PodcastHub");
    expect(result.descriptionText).toContain("First line");
    expect(result.descriptionText).toContain("Second line");
  });

  it("cleans job-board title decorations and caps long country lists", () => {
    const countries = [
      "BR",
      "CO",
      "AR",
      "CL",
      "VE",
      "BO",
      "EC",
      "US",
      "CA",
      "GB",
    ].map((name) => ({ "@type": "Country", name }));

    const result = extractJobFromHtml(
      `<html><head>${jsonLd({
        "@type": "JobPosting",
        title: "[Hiring] Senior Data Engineer @Lemon.io",
        hiringOrganization: { "@type": "Organization", name: "Lemon.io" },
        jobLocationType: "TELECOMMUTE",
        applicantLocationRequirements: countries,
      })}</head></html>`,
      "https://remotive.com/remote-jobs/data/senior-data-engineer-2091137",
    );

    expect(result.title).toBe("Senior Data Engineer");
    expect(result.company).toBe("Lemon.io");
    expect(result.location).toBeUndefined();
    expect(result.workplaceType).toBe("Remote");
  });

  it("falls back to OpenGraph and meta tags", () => {
    const result = extractJobFromHtml(
      `<html><head>
        <meta property="og:title" content="Staff Engineer" />
        <meta property="og:site_name" content="Indeed" />
        <meta property="og:description" content="Work on distributed systems." />
        <meta property="og:url" content="https://www.indeed.com/viewjob?jk=abc" />
        <meta property="og:type" content="article" />
      </head><body><h1>Ignored heading</h1></body></html>`,
      "https://www.indeed.com/viewjob?jk=abc",
    );

    expect(result.title).toBe("Staff Engineer");
    expect(result.company).toBe("Indeed");
    expect(result.descriptionText).toBe("Work on distributed systems.");
    expect(result.canonicalUrl).toBe("https://www.indeed.com/viewjob?jk=abc");
  });
});

describe("resolveJobFromUrl", () => {
  it("resolves a generic posting and sanitizes its description", async () => {    const html = `<html><head>
      ${jsonLd({
        "@type": "JobPosting",
        title: "Backend Engineer",
        hiringOrganization: { name: "Example Co" },
        jobLocation: { address: { addressLocality: "Remote" } },
        employmentType: "Contract",
        description:
          '<p onclick="evil()">Build APIs.</p><script>alert(1)</script>',
        baseSalary: { currency: "USD", value: { value: 130000 } },
      })}
    </head></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(html)));

    const result = await resolveJobFromUrl(
      "https://careers.example.com/jobs/123",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("generic");
      expect(result.data.sourceLabel).toBe("Company Career page");
      expect(result.data.title).toBe("Backend Engineer");
      expect(result.data.company).toBe("Example Co");
      expect(result.data.workplaceType).toBe("Remote");
      expect(result.data.salary).toBe("$130,000");
      expect(result.data.descriptionHtml).toContain("Build APIs.");
      expect(result.data.descriptionHtml).not.toContain("onclick");
      expect(result.data.descriptionHtml).not.toContain("<script");
    }
  });

  it("uses the job board's name as the source for a known site", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          `<html><head>
            <meta property="og:title" content="Data Engineer" />
            <meta property="og:site_name" content="Indeed" />
          </head></html>`,
        ),
      ),
    );

    const result = await resolveJobFromUrl("https://www.indeed.com/viewjob?jk=1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceLabel).toBe("Indeed");
      expect(result.data.company).toBe("Indeed");
    }
  });

  it("resolves a Greenhouse posting through the board API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      json({
        title: "Platform Engineer",
        company_name: "Globex",
        absolute_url: "https://job-boards.greenhouse.io/acme/jobs/123456",
        first_published: "2026-10-19T11:17:24-04:00",
        location: { name: "San Francisco, CA" },
        content:
          "&lt;p&gt;Own the platform.&lt;/p&gt;&lt;script&gt;alert(1)&lt;/script&gt;",
        metadata: [
          { name: "Location Type", value: "Hybrid" },
          { name: "Employment Type", value: "Full-time" },
          { name: "Salary Range", value: "$150,000 - $180,000" },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveJobFromUrl(
      "https://job-boards.greenhouse.io/acme/jobs/123456",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("greenhouse");
      expect(result.data.title).toBe("Platform Engineer");
      expect(result.data.company).toBe("Globex");
      expect(result.data.location).toBe("San Francisco, CA");
      expect(result.data.workplaceType).toBe("Hybrid");
      expect(result.data.employmentType).toBe("Full-time");
      expect(result.data.salary).toBe("$150,000 - $180,000");
      expect(result.data.descriptionHtml).toContain("Own the platform.");
      expect(result.data.descriptionHtml).not.toContain("<script");
    }
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining(
        "/v1/boards/acme/jobs/123456",
      ),
      expect.anything(),
    );
  });

  it("resolves a Lever posting and reads the company from the page", async () => {
    const page = `<html><head>${jsonLd({
      "@type": "JobPosting",
      title: "Backend Engineer",
      hiringOrganization: { name: "Acme" },
    })}</head></html>`;

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("api.lever.co")) {
        return Promise.resolve(
          json({
            id: "abcdef12",
            text: "Backend Engineer",
            hostedUrl: "https://jobs.lever.co/acme/abcdef12",
            workplaceType: "hybrid",
            createdAt: 1700000000000,
            categories: {
              commitment: "Full Time",
              location: "Toronto",
              allLocations: ["Toronto", "Remote"],
            },
            description: "<div><p>Build APIs.</p></div>",
            lists: [
              { text: "Requirements", content: "<ul><li>TypeScript</li></ul>" },
            ],
            additional: "<p>Great benefits.</p>",
            salaryRange: { min: 100000, max: 120000, currency: "USD" },
          }),
        );
      }
      return Promise.resolve(response(page));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveJobFromUrl(
      "https://jobs.lever.co/acme/abcdef12",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("lever");
      expect(result.data.company).toBe("Acme");
      expect(result.data.location).toBe("Toronto, Remote");
      expect(result.data.workplaceType).toBe("Hybrid");
      expect(result.data.salary).toBe("$100,000 - $120,000");
      expect(result.data.descriptionHtml).toContain("Build APIs.");
      expect(result.data.descriptionHtml).toContain("TypeScript");
      expect(result.data.descriptionHtml).toContain("Great benefits.");
    }
  });

  it("resolves an Ashby posting through the board API", async () => {
    const page = `<html><head>${jsonLd({
      "@type": "JobPosting",
      title: "Product Engineer",
      hiringOrganization: { name: "0x" },
    })}</head></html>`;

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("api.ashbyhq.com")) {
        return Promise.resolve(
          json({
            jobs: [
              {
                id: "abcdef12",
                title: "Product Engineer",
                jobUrl: "https://jobs.ashbyhq.com/0x/abcdef12",
                workplaceType: "Remote",
                employmentType: "FullTime",
                location: "Remote",
                publishedAt: "2026-08-24T22:36:09.456+00:00",
                descriptionHtml: "<p>Ship product.</p>",
              },
            ],
          }),
        );
      }
      return Promise.resolve(response(page));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveJobFromUrl(
      "https://jobs.ashbyhq.com/0x/abcdef12",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("ashby");
      expect(result.data.company).toBe("0x");
      expect(result.data.location).toBe("Remote");
      expect(result.data.workplaceType).toBe("Remote");
      expect(result.data.employmentType).toBe("FullTime");
      expect(result.data.descriptionHtml).toContain("Ship product.");
    }
  });

  it("falls back to the posting page when an ATS API fails", async () => {
    const html = `<html><head>${jsonLd({
      "@type": "JobPosting",
      title: "Recovered Engineer",
      hiringOrganization: { name: "Globex" },
    })}</head></html>`;

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("boards-api.greenhouse.io")) {
        return Promise.resolve(response("not found", 404));
      }
      return Promise.resolve(response(html));
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await resolveJobFromUrl(
      "https://job-boards.greenhouse.io/acme/jobs/123456",
    );

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.provider).toBe("generic");
      expect(result.data.title).toBe("Recovered Engineer");
    }
  });

  it("refuses to fetch private addresses", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchImportPage("http://127.0.0.1:3737/jobs/1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("parse");
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
