import { runAtsPipeline } from "@/lib/scraper/ats/pipeline";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobDetails } from "@/lib/scraper/types";

function job(overrides: Partial<JobDetails>): JobDetails {
  return {
    title: "",
    company: "Acme",
    location: "",
    description: "",
    url: `https://example.com/${Math.random()}`,
    ...overrides,
  };
}

const config = {
  targetTitles: ["Frontend Engineer"],
  keywords: ["react", "typescript"],
  locations: ["Canada"],
  strictLocation: false,
};

describe("runAtsPipeline", () => {
  it("keeps only floor-passers", () => {
    const jobs = [
      job({ title: "Frontend Engineer", description: "React" }), // title hit
      job({ title: "Cook", description: "make food" }), // no signal
      job({ title: "Chef", description: "react typescript daily" }), // 2 kw hits
    ];
    // Widen the corpus so the user's terms read as rare and both hitters clear
    // the minimum-score gate — this test is about the floor, not that gate.
    const corpus = [
      ...jobs,
      ...Array.from({ length: 10 }, () =>
        job({ title: "Cook", description: "make food" }),
      ),
    ];
    const result = runAtsPipeline(jobs, config, [], { corpus });
    expect(result.funnel.relevant).toBe(2);
    const all = [...result.toAnalyze, ...result.toSaveUnanalyzed];
    expect(all).toHaveLength(2);
  });

  it("cuts floor-passers that score below the minimum", () => {
    const jobs = [
      job({ title: "Frontend Engineer", description: "react typescript" }),
      job({ title: "Chef", description: "react once" }), // lone generic hit
    ];
    const corpus = [
      ...jobs,
      // "react" is everywhere in this corpus, so it carries almost no weight;
      // "typescript" and the title tokens stay rare.
      ...Array.from({ length: 10 }, () =>
        job({ title: "Cook", description: "react" }),
      ),
    ];
    const result = runAtsPipeline(jobs, config, [], { corpus });
    expect(result.funnel.floorSurvivors).toBe(2);
    expect(result.funnel.scoreCut).toBe(1);
    expect(result.funnel.relevant).toBe(1);
    expect(result.toAnalyze[0].job.title).toBe("Frontend Engineer");
  });

  it("fails open when the score gate would drop every floor-passer", () => {
    // Every job shares every search term, so idf drives all scores to ~0.
    const jobs = Array.from({ length: 4 }, () =>
      job({ title: "Frontend Engineer", description: "react typescript" }),
    );
    const result = runAtsPipeline(jobs, config, []);
    // Premise: without the fail-open these would all have been cut.
    for (const s of result.toAnalyze) {
      expect(s.score).toBeLessThan(APP_CONSTANTS.ATS_MIN_PRERANK_SCORE);
    }
    expect(result.funnel.floorSurvivors).toBe(4);
    expect(result.funnel.scoreCut).toBe(0);
    expect(result.funnel.relevant).toBe(4);
  });

  it("caps toAnalyze at K and pushes the rest to un-analyzed", () => {
    const jobs = Array.from({ length: 8 }, (_, i) =>
      job({ title: "Frontend Engineer", description: `React ${i}` }),
    );
    const result = runAtsPipeline(jobs, config, [], { k: 3, cap: 50 });
    expect(result.toAnalyze).toHaveLength(3);
    expect(result.toSaveUnanalyzed).toHaveLength(5);
  });

  it("applies the cap ceiling after the floor", () => {
    const jobs = Array.from({ length: 10 }, () =>
      job({ title: "Frontend Engineer" }),
    );
    const result = runAtsPipeline(jobs, config, [], { k: 2, cap: 4 });
    expect(result.funnel.relevant).toBe(4);
    // The uncapped count stays visible so the log can't report the cap as
    // though it were the floor result.
    expect(result.funnel.floorSurvivors).toBe(10);
    expect(
      result.toAnalyze.length + result.toSaveUnanalyzed.length,
    ).toBe(4);
  });

  it("omits the located stage when strictLocation is off", () => {
    const result = runAtsPipeline(
      [job({ title: "Frontend Engineer" })],
      config,
      [],
    );
    expect(result.funnel.located).toBeNull();
  });

  it("hard-gates off-location jobs when strictLocation is on", () => {
    const jobs = [
      job({ title: "Frontend Engineer", location: "Toronto, Canada" }),
      job({ title: "Frontend Engineer", location: "Berlin, Germany" }),
      job({ title: "Frontend Engineer", location: "Remote" }),
    ];
    const result = runAtsPipeline(
      jobs,
      { ...config, strictLocation: true },
      [],
    );
    expect(result.funnel.located).toBe(1); // only Canada; Berlin + Remote dropped
  });

  it("sorts toAnalyze by score descending", () => {
    const jobs = [
      job({ title: "Frontend Engineer", description: "react" }),
      job({
        title: "Frontend Engineer",
        description: "react typescript",
        location: "Canada",
      }),
    ];
    const result = runAtsPipeline(jobs, config, [], { k: 2 });
    expect(result.toAnalyze[0].score).toBeGreaterThanOrEqual(
      result.toAnalyze[1].score,
    );
  });
});
