import { decodeHtml, flattenHtml } from "@/lib/scraper/html";

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

describe("decodeHtml", () => {
  it("replaces out-of-range numeric entities instead of throwing", () => {
    for (const entity of ["&#1114112;", "&#x110000;", "&#99999999999999999999;", "&#0;", "&#xD800;"]) {
      expect(decodeHtml(`a${entity}b`)).toBe("a\uFFFDb");
    }
    expect(decodeHtml("&#x1F600;")).toBe("\u{1F600}");
  });
});
