import {
  buildSidebar,
  rewriteWikiLinks,
  toWikiFileName,
  toWikiPageName,
} from "@/lib/wiki/publish";

describe("toWikiPageName", () => {
  it("maps the bundle root to Home", () => {
    expect(toWikiPageName("index.md")).toBe("Home");
  });

  it("capitalises each hyphen-separated word", () => {
    expect(toWikiPageName("getting-started.md")).toBe("Getting-Started");
  });

  it("handles a single-word page", () => {
    expect(toWikiPageName("jobs.md")).toBe("Jobs");
  });

  it("joins nested path segments with a hyphen", () => {
    expect(toWikiPageName("jobs/csv-export.md")).toBe("Jobs-CSV-Export");
  });

  it("maps a nested index to its directory, not to Jobs-Index", () => {
    expect(toWikiPageName("jobs/index.md")).toBe("Jobs");
  });

  it("upper-cases known acronyms", () => {
    expect(toWikiPageName("ai-setup.md")).toBe("AI-Setup");
    expect(toWikiPageName("mcp-server.md")).toBe("MCP-Server");
    expect(toWikiPageName("pdf-export.md")).toBe("PDF-Export");
    expect(toWikiPageName("ats-sources.md")).toBe("ATS-Sources");
  });

  it("appends .md for the wiki filename", () => {
    expect(toWikiFileName("getting-started.md")).toBe("Getting-Started.md");
    expect(toWikiFileName("index.md")).toBe("Home.md");
  });
});

describe("rewriteWikiLinks", () => {
  it("rewrites a ./ relative link to the wiki page name", () => {
    expect(rewriteWikiLinks("See [Jobs](./jobs.md).")).toBe("See [Jobs](Jobs).");
  });

  it("rewrites a bare relative link", () => {
    expect(rewriteWikiLinks("See [Start](getting-started.md).")).toBe(
      "See [Start](Getting-Started)."
    );
  });

  it("preserves an anchor fragment", () => {
    expect(rewriteWikiLinks("[x](./jobs.md#how-do-i-add-a-job)")).toBe(
      "[x](Jobs#how-do-i-add-a-job)"
    );
  });

  it("rewrites the bundle root to Home", () => {
    expect(rewriteWikiLinks("[Index](./index.md)")).toBe("[Index](Home)");
  });

  it("resolves a sibling link from a nested page", () => {
    expect(rewriteWikiLinks("[Sib](./csv-export.md)", "jobs")).toBe(
      "[Sib](Jobs-CSV-Export)"
    );
  });

  it("leaves external links alone", () => {
    const raw = "[repo](https://github.com/Gsync/jobsync) and [d](http://x.dev/a.md)";
    expect(rewriteWikiLinks(raw)).toBe(raw);
  });

  it("leaves a pure anchor link alone", () => {
    expect(rewriteWikiLinks("[top](#how-do-i-add-a-job)")).toBe(
      "[top](#how-do-i-add-a-job)"
    );
  });

  it("leaves image and non-markdown targets alone", () => {
    expect(rewriteWikiLinks("[shot](./screenshot.png)")).toBe("[shot](./screenshot.png)");
  });
});

describe("buildSidebar", () => {
  it("lists Home first, then every linked page in index order", () => {
    const body = `# JobSync Help

- [Getting Started](Getting-Started) — first run.
- [Jobs](Jobs) — track applications.
`;
    expect(buildSidebar(body)).toBe(
      `### JobSync Help

- [Home](Home)
- [Getting Started](Getting-Started)
- [Jobs](Jobs)
`
    );
  });

  it("ignores prose lines and inline links outside the list", () => {
    const body = "Intro with a [link](Jobs).\n\n- [Jobs](Jobs) — track.\n";
    expect(buildSidebar(body)).toBe("### JobSync Help\n\n- [Home](Home)\n- [Jobs](Jobs)\n");
  });
});
