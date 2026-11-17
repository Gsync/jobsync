import { parseWikiPage } from "@/lib/wiki/parse";
import { wikiIndexSchema, wikiPageSchema } from "@/lib/wiki/schema";

const PAGE = `---
type: how-to
title: Track a job application
description: Add a job manually or by pasting a posting into AI chat.
feature: jobs
tags: [jobs, applications, status]
aliases: [add a job, job board]
status: stable
stale_after: 2027-08-31
---

Intro line.

## How do I add a job?

Click Add Job.

## How do I export?

Click Export.
`;

describe("parseWikiPage", () => {
  it("reads scalars and inline arrays", () => {
    const { frontmatter } = parseWikiPage(PAGE);
    expect(frontmatter.type).toBe("how-to");
    expect(frontmatter.title).toBe("Track a job application");
    expect(frontmatter.tags).toEqual(["jobs", "applications", "status"]);
    expect(frontmatter.aliases).toEqual(["add a job", "job board"]);
    expect(frontmatter.stale_after).toBe("2027-08-31");
  });

  it("strips the frontmatter block from the body", () => {
    const { body } = parseWikiPage(PAGE);
    expect(body.startsWith("Intro line.")).toBe(true);
    expect(body).not.toContain("---");
    expect(body).not.toContain("type: how-to");
  });

  it("returns H2 headings in document order", () => {
    expect(parseWikiPage(PAGE).headings).toEqual([
      "How do I add a job?",
      "How do I export?",
    ]);
  });

  it("ignores H1, H3 and headings inside fenced code blocks", () => {
    const raw = `---
type: reference
---

# Page title

### Sub

\`\`\`markdown
## Not a real heading
\`\`\`

## Real heading
`;
    expect(parseWikiPage(raw).headings).toEqual(["Real heading"]);
  });

  it("strips matching surrounding quotes from a scalar", () => {
    const raw = `---
okf_version: "0.2"
---

Body.
`;
    expect(parseWikiPage(raw).frontmatter.okf_version).toBe("0.2");
  });

  it("returns an empty array for an empty inline array", () => {
    const raw = `---
type: reference
tags: []
---

Body.
`;
    expect(parseWikiPage(raw).frontmatter.tags).toEqual([]);
  });

  it("throws when the file does not open with a frontmatter fence", () => {
    expect(() => parseWikiPage("# No frontmatter\n")).toThrow(
      /must start with a frontmatter block/i
    );
  });

  it("throws when the frontmatter block is never closed", () => {
    expect(() => parseWikiPage("---\ntype: how-to\n")).toThrow(/unterminated/i);
  });

  it("throws on a line with no colon", () => {
    expect(() => parseWikiPage("---\ntype how-to\n---\n")).toThrow(
      /expected "key: value"/i
    );
  });

  it("throws on a block list, the grammar's deliberate limit", () => {
    const raw = `---
type: how-to
tags:
  - jobs
---
`;
    expect(() => parseWikiPage(raw)).toThrow(/expected "key: value"/i);
  });

  it("throws on a duplicate key", () => {
    expect(() => parseWikiPage("---\ntype: how-to\ntype: tutorial\n---\n")).toThrow(
      /duplicate key "type"/i
    );
  });
});

const VALID = {
  type: "how-to",
  title: "Track a job application",
  description: "Add a job manually or by pasting a posting into AI chat.",
  feature: "jobs",
  tags: ["jobs", "applications"],
};

describe("wikiPageSchema", () => {
  it("accepts a minimal valid page and defaults status to stable", () => {
    const parsed = wikiPageSchema.parse(VALID);
    expect(parsed.status).toBe("stable");
    expect(parsed.aliases).toBeUndefined();
  });

  it("accepts every optional field", () => {
    const parsed = wikiPageSchema.parse({
      ...VALID,
      aliases: ["job board"],
      status: "draft",
      stale_after: "2027-08-31",
    });
    expect(parsed.stale_after).toBe("2027-08-31");
  });

  it("rejects a type outside the Diataxis vocabulary", () => {
    expect(wikiPageSchema.safeParse({ ...VALID, type: "guide" }).success).toBe(false);
  });

  it("rejects an unknown feature area", () => {
    expect(wikiPageSchema.safeParse({ ...VALID, feature: "billing" }).success).toBe(false);
  });

  it("rejects an empty tags array", () => {
    expect(wikiPageSchema.safeParse({ ...VALID, tags: [] }).success).toBe(false);
  });

  it("rejects a misspelled key rather than ignoring it", () => {
    expect(wikiPageSchema.safeParse({ ...VALID, tag: ["jobs"] }).success).toBe(false);
  });

  it("rejects a non-ISO stale_after", () => {
    expect(
      wikiPageSchema.safeParse({ ...VALID, stale_after: "31/08/2027" }).success
    ).toBe(false);
  });

  it("validates real parser output end to end", () => {
    const { frontmatter } = parseWikiPage(PAGE);
    expect(wikiPageSchema.parse(frontmatter).feature).toBe("jobs");
  });
});

describe("wikiIndexSchema", () => {
  it("accepts the bundle root", () => {
    expect(wikiIndexSchema.parse({ okf_version: "0.2" }).okf_version).toBe("0.2");
  });

  it("rejects a page-shaped frontmatter", () => {
    expect(wikiIndexSchema.safeParse(VALID).success).toBe(false);
  });
});
