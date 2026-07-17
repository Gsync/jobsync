import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";

describe("canonicalizeEntityValue", () => {
  it("lowercases and trims", () => {
    expect(canonicalizeEntityValue("  Figma  ")).toBe("figma");
  });

  it("collapses internal whitespace to a single space", () => {
    expect(canonicalizeEntityValue("Full   Stack  Developer")).toBe(
      "full stack developer",
    );
  });

  it("treats commas as separators", () => {
    expect(canonicalizeEntityValue("San Francisco, CA")).toBe(
      "san francisco ca",
    );
  });

  it("folds diacritics", () => {
    expect(canonicalizeEntityValue("Zürich")).toBe("zurich");
    expect(canonicalizeEntityValue("México City")).toBe("mexico city");
  });

  it("keeps distinguishing punctuation so C++ and C# never collapse", () => {
    expect(canonicalizeEntityValue("C++ Developer")).toBe("c++ developer");
    expect(canonicalizeEntityValue("C# Developer")).toBe("c# developer");
    expect(canonicalizeEntityValue("C++ Developer")).not.toBe(
      canonicalizeEntityValue("C# Developer"),
    );
  });

  it("does not fold seniority (Senior vs Junior stay distinct)", () => {
    expect(canonicalizeEntityValue("Senior Engineer")).not.toBe(
      canonicalizeEntityValue("Junior Engineer"),
    );
  });

  describe("legal-suffix stripping (companies only)", () => {
    const strip = { stripLegalSuffix: true };

    it("collapses Inc / LLC / Ltd variants of the same company", () => {
      const canonical = canonicalizeEntityValue("Google", strip);
      expect(canonicalizeEntityValue("Google Inc", strip)).toBe(canonical);
      expect(canonicalizeEntityValue("Google, Inc.", strip)).toBe(canonical);
      expect(canonicalizeEntityValue("Google LLC", strip)).toBe(canonical);
    });

    it("unwinds stacked suffixes", () => {
      expect(canonicalizeEntityValue("Foo Corp Company", strip)).toBe("foo");
    });

    it("does not strip when stripLegalSuffix is off", () => {
      expect(canonicalizeEntityValue("Google Inc")).toBe("google inc");
    });

    it("does not over-strip a suffix embedded in a real name", () => {
      expect(canonicalizeEntityValue("Costco", strip)).toBe("costco");
    });

    it("falls back to the base form when the label is only a suffix", () => {
      expect(canonicalizeEntityValue("Inc", strip)).toBe("inc");
    });
  });
});
