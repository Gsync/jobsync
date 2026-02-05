import {
  normalizeJobUrl,
  normalizeForSearch,
  extractKeywords,
  extractCityName,
} from "@/lib/scraper/utils";

describe("normalizeJobUrl", () => {
  it("removes utm_source parameter", () => {
    const url = "https://example.com/job?utm_source=google&id=123";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?id=123");
  });

  it("removes all UTM parameters", () => {
    const url =
      "https://example.com/job?utm_source=x&utm_medium=y&utm_campaign=z&utm_term=a&utm_content=b&id=1";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?id=1");
  });

  it("removes fbclid parameter", () => {
    const url = "https://example.com/job?fbclid=abc123&title=dev";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?title=dev");
  });

  it("removes gclid parameter", () => {
    const url = "https://example.com/job?gclid=xyz&role=swe";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?role=swe");
  });

  it("removes msclkid parameter", () => {
    const url = "https://example.com/job?msclkid=abc&id=5";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?id=5");
  });

  it("removes ref, source, tk, from, vjk parameters", () => {
    const url =
      "https://example.com/job?ref=email&source=board&tk=abc&from=search&vjk=xyz&id=1";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job?id=1");
  });

  it("returns clean URL when all params are tracking", () => {
    const url = "https://example.com/job?utm_source=google&fbclid=abc";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job");
  });

  it("preserves non-tracking parameters", () => {
    const url = "https://example.com/job?id=123&position=dev";
    expect(normalizeJobUrl(url)).toBe(
      "https://example.com/job?id=123&position=dev"
    );
  });

  it("preserves URL path and hash", () => {
    const url = "https://example.com/jobs/123#details?utm_source=x";
    const result = normalizeJobUrl(url);
    expect(result).toContain("/jobs/123");
  });

  it("returns original string for invalid URLs", () => {
    const invalid = "not-a-valid-url";
    expect(normalizeJobUrl(invalid)).toBe(invalid);
  });

  it("handles URL with no query parameters", () => {
    const url = "https://example.com/job/123";
    expect(normalizeJobUrl(url)).toBe("https://example.com/job/123");
  });
});

describe("normalizeForSearch", () => {
  it("converts to lowercase", () => {
    expect(normalizeForSearch("Software Engineer")).toBe("software-engineer");
  });

  it("trims whitespace", () => {
    expect(normalizeForSearch("  hello  ")).toBe("hello");
  });

  it("replaces spaces with dashes", () => {
    expect(normalizeForSearch("full stack developer")).toBe(
      "full-stack-developer"
    );
  });

  it("removes special characters", () => {
    expect(normalizeForSearch("C++ Developer (Senior)")).toBe(
      "c-developer-senior"
    );
  });

  it("collapses multiple spaces into single dash", () => {
    expect(normalizeForSearch("word1   word2")).toBe("word1-word2");
  });

  it("handles empty string", () => {
    expect(normalizeForSearch("")).toBe("");
  });

  it("preserves numbers", () => {
    expect(normalizeForSearch("Level 3 Support")).toBe("level-3-support");
  });

  it("removes punctuation", () => {
    expect(normalizeForSearch("Sr. Engineer, Backend")).toBe(
      "sr-engineer-backend"
    );
  });
});

describe("extractKeywords", () => {
  it("extracts words longer than 2 characters", () => {
    const result = extractKeywords("Software Developer");
    expect(result).toEqual(["software", "developer"]);
  });

  it("filters out words with 2 or fewer characters", () => {
    const result = extractKeywords("I am a dev");
    expect(result).toEqual(["dev"]);
  });

  it("filters out stop words", () => {
    const result = extractKeywords("Senior Software Engineer at the Company");
    expect(result).toEqual(["software", "engineer"]);
  });

  it("splits on spaces", () => {
    expect(extractKeywords("react node python")).toEqual([
      "react",
      "node",
      "python",
    ]);
  });

  it("splits on dashes", () => {
    expect(extractKeywords("full-stack-developer")).toEqual([
      "full",
      "stack",
      "developer",
    ]);
  });

  it("splits on underscores", () => {
    expect(extractKeywords("data_science_role")).toEqual([
      "data",
      "science",
      "role",
    ]);
  });

  it("splits on commas", () => {
    expect(extractKeywords("react,node,python")).toEqual([
      "react",
      "node",
      "python",
    ]);
  });

  it("splits on dots", () => {
    expect(extractKeywords("google.amazon.meta")).toEqual([
      "google",
      "amazon",
      "meta",
    ]);
  });

  it("converts to lowercase", () => {
    expect(extractKeywords("React Node")).toEqual(["react", "node"]);
  });

  it("filters all stop words", () => {
    const stopWords = [
      "senior",
      "jr",
      "junior",
      "sr",
      "inc",
      "llc",
      "ltd",
      "corp",
      "corporation",
      "the",
      "a",
      "an",
      "co",
      "company",
    ];
    stopWords.forEach((word) => {
      expect(extractKeywords(word)).toEqual([]);
    });
  });

  it("returns empty array for empty string", () => {
    expect(extractKeywords("")).toEqual([]);
  });
});

describe("extractCityName", () => {
  it("extracts city from city, state format", () => {
    expect(extractCityName("Calgary, AB")).toBe("calgary");
  });

  it("extracts city from city, state, country format", () => {
    expect(extractCityName("New York, NY, USA")).toBe("new york");
  });

  it("returns lowercase city name", () => {
    expect(extractCityName("TORONTO, ON")).toBe("toronto");
  });

  it("trims whitespace from city name", () => {
    expect(extractCityName("  Vancouver , BC")).toBe("vancouver");
  });

  it("returns the full string (lowercase) when no comma", () => {
    expect(extractCityName("Remote")).toBe("remote");
  });

  it("handles empty string", () => {
    expect(extractCityName("")).toBe("");
  });
});
