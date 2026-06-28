import { scoreJob, passesFloor, locationMatches } from "@/lib/scraper/greenhouse/rank";
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
  it("always passes for remote regardless of preference", () => {
    expect(locationMatches("Remote - Americas", ["Canada"])).toBe(true);
    expect(locationMatches("Fully remote", [])).toBe(true);
  });

  it("empty preference = no constraint (passes all)", () => {
    expect(locationMatches("Berlin, Germany", [])).toBe(true);
  });

  it("case-insensitive substring against free-text location", () => {
    expect(locationMatches("SF | NYC", ["nyc"])).toBe(true);
    expect(locationMatches("San Francisco, CA", ["new york"])).toBe(false);
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

  it("false-positive suppression: off-title role with one stray keyword ranks low and fails floor", () => {
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
    expect(passesFloor(sales.components)).toBe(false);
    expect(passesFloor(real.components)).toBe(true);
  });

  it("location soft-weight raises a matching job above an otherwise-equal one", () => {
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
    expect(inLoc.score).toBeGreaterThan(outLoc.score);
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

describe("passesFloor", () => {
  const base = { titleScore: 0, keywordScore: 0, locScore: 0 };

  it(">=1 title token passes", () => {
    expect(
      passesFloor({ ...base, titleHits: ["engineer"], keywordHits: [] }),
    ).toBe(true);
  });

  it(">=2 keyword hits passes", () => {
    expect(
      passesFloor({ ...base, titleHits: [], keywordHits: ["react", "node"] }),
    ).toBe(true);
  });

  it("1 stray keyword + no title fails", () => {
    expect(
      passesFloor({ ...base, titleHits: [], keywordHits: ["react"] }),
    ).toBe(false);
  });

  it("unconventional title rescued by 2 keyword hits", () => {
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
