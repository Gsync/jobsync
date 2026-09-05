import { flattenHtml } from "@/lib/scraper/html";

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
