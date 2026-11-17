import {
  scoreJob,
  passesFloor,
  locationMatches,
  buildIdf,
} from "@/lib/scraper/ats/rank";
import type { JobDetails } from "@/lib/scraper/types";

function job(overrides: Partial<JobDetails>): JobDetails {
  return {
    title: "",
    company: "Acme",
    location: "",
    description: "",
    url: "https://example.com/1",
    ...overrides,
  };
}

describe("locationMatches", () => {
  it("remote only matches when explicitly listed as a wanted location", () => {
    expect(locationMatches("Remote - Americas", ["remote"])).toBe(true);
    expect(locationMatches("Remote - Americas", ["Canada"])).toBe(false);
    expect(locationMatches("Fully remote", [])).toBe(true);
  });

  it("empty preference = no constraint (passes all)", () => {
    expect(locationMatches("Berlin, Germany", [])).toBe(true);
  });

  it("case-insensitive substring against free-text location", () => {
    expect(locationMatches("SF | NYC", ["nyc"])).toBe(true);
    expect(locationMatches("San Francisco, CA", ["new york"])).toBe(false);
  });

  it("matches whole terms only, never a substring of a longer word", () => {
    const binance =
      "Asia, Hong Kong, Taiwan, Taipei, Australia, Brisbane, Australia, Sydney";
    expect(locationMatches(binance, ["Canada", "US"])).toBe(false);
    expect(locationMatches("Minsk, Belarus", ["US"])).toBe(false);
    expect(locationMatches("Houston, TX", ["US"])).toBe(false);
    expect(locationMatches("New York, US", ["Canada", "US"])).toBe(true);
    expect(locationMatches("Remote - US", ["US"])).toBe(true);
  });
});

describe("scoreJob", () => {
  it("matches target-title tokens (token-based, not exact)", () => {
    const { components } = scoreJob(
      job({ title: "Senior Frontend Engineer" }),
      ["Frontend Engineer"],
      [],
      [],
      [],
    );
    expect(components.titleHits.sort()).toEqual(["engineer", "frontend"]);
  });

  it("keyword hits use word boundaries (no substring false positives)", () => {
    const { components } = scoreJob(
      job({ title: "Sales Rep", description: "a highly reactive frontend" }),
      [],
      ["react"],
      [],
      [],
    );
    expect(components.keywordHits).toEqual([]);
  });

  it("counts a genuine keyword hit", () => {
    const { components } = scoreJob(
      job({ title: "Engineer", description: "Build with React and Node" }),
      [],
      ["react", "node"],
      [],
      [],
    );
    expect(components.keywordHits.sort()).toEqual(["node", "react"]);
  });

  it("false-positive suppression: off-title role with one stray keyword ranks below the real one", () => {
    const sales = scoreJob(
      job({ title: "Account Executive", description: "react to client needs" }),
      ["Frontend Engineer"],
      ["react"],
      [],
      [],
    );
    const real = scoreJob(
      job({ title: "Frontend Engineer", description: "React, TypeScript" }),
      ["Frontend Engineer"],
      ["react"],
      [],
      [],
    );
    expect(real.score).toBeGreaterThan(sales.score);
    // A stray hit clears the minimum-signal floor; ranking, not the gate, is
    // what keeps it out of the top-K.
    expect(passesFloor(sales.components)).toBe(true);
    expect(passesFloor(real.components)).toBe(true);
  });

  it("location does not affect the relevance score (gate-only signal)", () => {
    const inLoc = scoreJob(
      job({ title: "Frontend Engineer", location: "Toronto, Canada" }),
      ["Frontend Engineer"],
      [],
      [],
      ["Canada"],
    );
    const outLoc = scoreJob(
      job({ title: "Frontend Engineer", location: "Berlin, Germany" }),
      ["Frontend Engineer"],
      [],
      [],
      ["Canada"],
    );
    expect(inLoc.score).toBe(outLoc.score);
    // locScore is still recorded for the breakdown UI.
    expect(inLoc.components.locScore).toBe(1);
    expect(outLoc.components.locScore).toBe(0);
  });

  it("empty locations contributes 0 location weight", () => {
    const { components } = scoreJob(
      job({ title: "Frontend Engineer", location: "Toronto" }),
      ["Frontend Engineer"],
      [],
      [],
      [],
    );
    expect(components.locScore).toBe(0);
  });

  it("fallback: keywords only (no titles) scores on skill overlap", () => {
    const { components } = scoreJob(
      job({ title: "Software Developer", description: "Python, Django" }),
      [],
      ["python"],
      [],
      [],
    );
    expect(components.titleHits).toEqual([]);
    expect(components.keywordHits).toEqual(["python"]);
  });

  it("fallback: resume skills only", () => {
    const { components } = scoreJob(
      job({ title: "Developer", description: "Go, Kubernetes, Docker" }),
      [],
      [],
      ["kubernetes", "docker"],
      [],
    );
    expect(components.keywordHits.sort()).toEqual(["docker", "kubernetes"]);
  });
});

describe("buildIdf (term rarity weighting)", () => {
  it("scores a rare-term match above a generic-term match", () => {
    const corpus = [
      job({ title: "Software Engineer", description: "engineer" }),
      job({ title: "Senior Engineer", description: "engineer" }),
      job({ title: "Staff Engineer", description: "engineer" }),
      job({ title: "Platform Engineer", description: "kubernetes" }),
    ];
    const idf = buildIdf(corpus);
    expect(idf("engineer")).toBeLessThan(idf("kubernetes"));

    const generic = scoreJob(
      job({ description: "engineer" }),
      [],
      ["engineer", "kubernetes"],
      [],
      [],
      idf,
    );
    const rare = scoreJob(
      job({ description: "kubernetes" }),
      [],
      ["engineer", "kubernetes"],
      [],
      [],
      idf,
    );
    expect(rare.score).toBeGreaterThan(generic.score);
  });

  it("default idf (no corpus) preserves count-based behavior", () => {
    const { components } = scoreJob(
      job({ title: "Frontend Engineer" }),
      ["Frontend Engineer"],
      [],
      [],
      [],
    );
    expect(components.titleScore).toBe(1); // min(1, 2 hits / 2)
  });
});

describe("passesFloor", () => {
  const base = { titleScore: 0, keywordScore: 0, locScore: 0 };

  it(">=1 title token passes", () => {
    expect(
      passesFloor({ ...base, titleHits: ["engineer"], keywordHits: [] }),
    ).toBe(true);
  });

  it(">=1 keyword hit passes", () => {
    expect(
      passesFloor({ ...base, titleHits: [], keywordHits: ["react"] }),
    ).toBe(true);
  });

  it("unconventional title rescued by a keyword hit", () => {
    expect(
      passesFloor({
        ...base,
        titleHits: [],
        keywordHits: ["python", "ml"],
      }),
    ).toBe(true);
  });

  it("no signal fails", () => {
    expect(passesFloor({ ...base, titleHits: [], keywordHits: [] })).toBe(
      false,
    );
  });
});
