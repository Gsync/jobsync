import { lookup } from "node:dns/promises";
import {
  clearJobPostingCache,
  extractJobPosting,
  scrapeJobPosting,
} from "@/lib/scraper/jobPosting";
import { htmlToText } from "@/lib/scraper/html";

vi.mock("node:dns/promises", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:dns/promises")>();
  return { ...actual, lookup: vi.fn() };
});

const PUBLIC_IP = "93.184.216.34";

function htmlResponse(
  html: string,
  init: { status?: number; contentType?: string } = {},
) {
  const status = init.status ?? 200;
  const contentType = init.contentType ?? "text/html; charset=utf-8";
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "content-type" ? contentType : null,
    },
    body: null,
    text: async () => html,
  };
}

function redirectResponse(location: string) {
  return {
    status: 302,
    ok: false,
    headers: {
      get: (name: string) => (name.toLowerCase() === "location" ? location : null),
    },
    body: null,
    text: async () => "",
  };
}

const jsonLdHtml = `<!doctype html>
<html>
  <head>
    <title>Senior Platform Engineer at Acme</title>
    <meta property="og:site_name" content="Acme" />
    <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        "title": "Senior Platform Engineer",
        "hiringOrganization": { "@type": "Organization", "name": "Acme" },
        "jobLocation": {
          "@type": "Place",
          "address": { "addressLocality": "Austin", "addressRegion": "TX" }
        },
        "description": "<p>Build the platform.</p><ul><li>Go</li><li>Kubernetes</li></ul>",
        "employmentType": "FULL_TIME",
        "baseSalary": {
          "@type": "MonetaryAmount",
          "currency": "USD",
          "value": {
            "@type": "QuantitativeValue",
            "minValue": 150000,
            "maxValue": 180000,
            "unitText": "YEAR"
          }
        },
        "datePosted": "2026-01-02",
        "skills": ["Go", "Kubernetes"]
      }
    </script>
  </head>
  <body><h1>Senior Platform Engineer</h1></body>
</html>`;

describe("htmlToText", () => {
  it("keeps paragraph and list structure while dropping scripts", () => {
    const text = htmlToText(
      "<div><p>Hello &amp; welcome</p><script>alert(1)</script><ul><li>One</li><li>Two</li></ul></div>",
    );
    expect(text).toContain("Hello & welcome");
    expect(text).toContain("- One");
    expect(text).toContain("- Two");
    expect(text).not.toContain("alert");
    expect(text.split("\n").filter(Boolean).length).toBeGreaterThan(1);
  });

  it("returns an empty string for empty input", () => {
    expect(htmlToText("")).toBe("");
  });
});

describe("extractJobPosting", () => {
  it("reads a JSON-LD JobPosting before the visible page", () => {
    const posting = extractJobPosting(jsonLdHtml, "https://acme.com/jobs/1?utm_source=x");

    expect(posting.title).toBe("Senior Platform Engineer");
    expect(posting.company).toBe("Acme");
    expect(posting.location).toBe("Austin, TX");
    expect(posting.description).toContain("Build the platform.");
    expect(posting.description).toContain("- Go");
    expect(posting.employmentType).toBe("Full-time");
    expect(posting.salary).toBe("$150,000 – $180,000 per year");
    expect(posting.skills).toEqual(["Go", "Kubernetes"]);
    expect(posting.postedDate).toBe("2026-01-02");
    expect(posting.structuredData).toBe(true);
    // Provenance uses the normalized URL, not the tracking-laden input.
    expect(posting.url).toBe("https://acme.com/jobs/1");
    expect(posting.warnings).toBeUndefined();
  });

  it("finds a JobPosting nested inside an @graph", () => {
    const html = `<script type="application/ld+json">
      {"@context":"https://schema.org","@graph":[
        {"@type":"Organization","name":"Acme"},
        {"@type":"JobPosting","title":"Data Analyst","hiringOrganization":{"name":"Acme"},"description":"Analyse data."}
      ]}
    </script>`;

    const posting = extractJobPosting(html, "https://acme.com/jobs/2");
    expect(posting.title).toBe("Data Analyst");
    expect(posting.company).toBe("Acme");
    expect(posting.structuredData).toBe(true);
  });

  it("falls back to meta and title text when the page has no structured data", () => {
    const html = `<!doctype html>
      <html>
        <head>
          <title>Data Analyst at Gamma</title>
          <meta name="description" content="Analyse data for the team." />
          <meta property="og:site_name" content="Gamma" />
        </head>
        <body><main></main></body>
      </html>`;

    const posting = extractJobPosting(html, "https://gamma.example/careers/1");

    expect(posting.title).toBe("Data Analyst");
    expect(posting.company).toBe("Gamma");
    expect(posting.description).toBe("Analyse data for the team.");
    expect(posting.structuredData).toBe(false);
    expect(posting.source).toBe("Gamma");
    expect(posting.warnings?.join(" ")).toMatch(/inferred from the visible text/i);
  });

  it("names a known job board as the source instead of using it as the company", () => {
    const html = `<html><head>
      <meta property="og:site_name" content="LinkedIn" />
      <title>Backend Engineer at Beta Corp | LinkedIn</title>
    </head><body></body></html>`;

    const posting = extractJobPosting(html, "https://www.linkedin.com/jobs/view/1");
    expect(posting.source).toBe("LinkedIn");
    expect(posting.company).toBe("Beta Corp");
    expect(posting.title).toBe("Backend Engineer");
  });
});

describe("scrapeJobPosting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearJobPostingCache();
    (lookup as any).mockResolvedValue([{ address: PUBLIC_IP, family: 4 }]);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("blocks localhost and private addresses before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    for (const url of [
      "http://localhost:3737/jobs/1",
      "http://127.0.0.1/jobs/1",
      "http://10.0.0.5/jobs/1",
      "http://169.254.169.254/latest/meta-data",
    ]) {
      const result = await scrapeJobPosting(url);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe("blocked");
    }

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-http protocols and embedded credentials", async () => {
    for (const url of [
      "file:///etc/passwd",
      "https://user:pass@acme.com/jobs/1",
      "https://acme.com:8080/jobs/1",
    ]) {
      const result = await scrapeJobPosting(url);
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.type).toBe("blocked");
    }
  });

  it("blocks a redirect that points at a private address", async () => {
    const fetchMock = vi.fn().mockResolvedValue(redirectResponse("http://127.0.0.1/admin"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeJobPosting("https://acme.com/jobs/1");

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.type).toBe("blocked");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("follows a public redirect and extracts the destination", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(redirectResponse("https://www.acme.com/jobs/1"))
      .mockResolvedValueOnce(htmlResponse(jsonLdHtml));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeJobPosting("https://acme.com/jobs/1");

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("Senior Platform Engineer");
      expect(result.data.url).toBe("https://www.acme.com/jobs/1");
    }
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("caches a successful read so add_job does not fetch again", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse(jsonLdHtml));
    vi.stubGlobal("fetch", fetchMock);

    const first = await scrapeJobPosting("https://acme.com/jobs/1");
    const second = await scrapeJobPosting("https://acme.com/jobs/1");

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // The cache key ignores tracking parameters.
    await scrapeJobPosting("https://acme.com/jobs/1?utm_campaign=spring");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reports a non-HTML response as a parse failure", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(htmlResponse("%PDF-1.7", { contentType: "application/pdf" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeJobPosting("https://acme.com/jobs/1.pdf");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("parse");
      if (result.error.type === "parse") {
        expect(result.error.message).toMatch(/not an HTML page/i);
      }
    }
  });

  it("reports an HTTP failure as a network error", async () => {
    const fetchMock = vi.fn().mockResolvedValue(htmlResponse("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await scrapeJobPosting("https://acme.com/jobs/1");

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.type).toBe("network");
      if (result.error.type === "network") {
        expect(result.error.message).toMatch(/HTTP 404/);
      }
    }
  });
});
