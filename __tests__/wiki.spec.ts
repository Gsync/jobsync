import fs from "node:fs";
import path from "node:path";
import { parseWikiPage } from "@/lib/wiki/parse";
import { wikiIndexSchema, wikiPageSchema } from "@/lib/wiki/schema";
import { z } from "zod";

const WIKI_DIR = path.join(process.cwd(), "wiki");
const INDEX = "index.md";

function listMarkdown(dir: string, prefix = ""): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) return listMarkdown(path.join(dir, entry.name), rel);
    return entry.name.endsWith(".md") ? [rel] : [];
  });
}

// sort(): readdirSync is unordered, so without it the it.each test names
// shuffle between filesystems (Locked Decision #12).
const files = fs.existsSync(WIKI_DIR) ? listMarkdown(WIKI_DIR).sort() : [];
// log.md is OKF's reserved history file: prose, no frontmatter, not a page.
const pages = files.filter((f) => f !== INDEX && f !== "log.md");
const read = (rel: string) => fs.readFileSync(path.join(WIKI_DIR, rel), "utf8");

// it.each throws on an empty array, which would mask the real problem. The
// "contains the bundle root" test is what reports a missing or empty wiki/.
const eachPage = pages.length > 0 ? it.each(pages) : it.skip.each(["(none)"]);
const eachFile = files.length > 0 ? it.each(files) : it.skip.each(["(none)"]);

describe("wiki bundle", () => {
  it("contains the bundle root and at least one page", () => {
    expect(files).toContain(INDEX);
    expect(pages.length).toBeGreaterThan(0);
  });

  it("validates the bundle root against wikiIndexSchema", () => {
    const { frontmatter } = parseWikiPage(read(INDEX));
    const result = wikiIndexSchema.safeParse(frontmatter);
    expect(result.success, result.error && z.prettifyError(result.error)).toBe(true);
  });

  eachPage("%s parses and passes wikiPageSchema", (rel) => {
    const { frontmatter } = parseWikiPage(read(rel));
    const result = wikiPageSchema.safeParse(frontmatter);
    expect(result.success, result.error && z.prettifyError(result.error)).toBe(true);
  });

  eachPage("%s has unique H2 headings", (rel) => {
    const { headings } = parseWikiPage(read(rel));
    expect(headings.length).toBeGreaterThan(0);
    expect(new Set(headings).size).toBe(headings.length);
  });

  eachPage("%s phrases every H2 as a user question", (rel) => {
    const { headings } = parseWikiPage(read(rel));
    for (const heading of headings) {
      expect(heading.endsWith("?"), `"${heading}" in ${rel}`).toBe(true);
    }
  });

  eachPage("%s keeps sections under 300 words and the page under 2000", (rel) => {
    const body = parseWikiPage(read(rel)).body;
    const words = (text: string) => text.split(/\s+/).filter(Boolean).length;
    expect(words(body), rel).toBeLessThan(2000);
    for (const section of body.split(/^## /m).slice(1)) {
      const heading = section.split("\n")[0];
      expect(words(section), `${rel}: ## ${heading}`).toBeLessThan(300);
    }
  });

  eachFile("%s has no dead intra-wiki links", (rel) => {
    const body = parseWikiPage(read(rel)).body;
    const fromDir = path.posix.dirname(rel);
    for (const [, target] of body.matchAll(/\]\(([^)\s]+)\)/g)) {
      if (/^[a-z][a-z0-9+.-]*:/i.test(target) || target.startsWith("#")) continue;
      const [pathPart] = target.split("#");
      if (!pathPart.endsWith(".md")) continue;
      const resolved = path.posix.normalize(path.posix.join(fromDir, pathPart));
      expect(files, `${rel} -> ${target}`).toContain(resolved);
    }
  });

  it("links to every page from index.md exactly once", () => {
    const body = parseWikiPage(read(INDEX)).body;
    const linked = [...body.matchAll(/\]\(\.?\/?([^)\s#]+\.md)\)/g)].map((m) =>
      path.posix.normalize(m[1])
    );
    for (const page of pages) {
      expect(linked.filter((l) => l === page)).toHaveLength(1);
    }
  });
});
