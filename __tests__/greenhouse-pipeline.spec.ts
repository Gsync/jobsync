import { runGreenhousePipeline } from "@/lib/scraper/greenhouse/pipeline";
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

describe("runGreenhousePipeline", () => {
  it("keeps only floor-passers", () => {
    const jobs = [
      job({ title: "Frontend Engineer", description: "React" }), // title hit
      job({ title: "Cook", description: "make food" }), // no signal
      job({ title: "Chef", description: "react typescript daily" }), // 2 kw hits
    ];
    const result = runGreenhousePipeline(jobs, config, []);
    expect(result.funnel.relevant).toBe(2);
    const all = [...result.toAnalyze, ...result.toSaveUnanalyzed];
    expect(all).toHaveLength(2);
  });

  it("caps toAnalyze at K and pushes the rest to un-analyzed", () => {
    const jobs = Array.from({ length: 8 }, (_, i) =>
      job({ title: "Frontend Engineer", description: `React ${i}` }),
    );
    const result = runGreenhousePipeline(jobs, config, [], { k: 3, cap: 50 });
    expect(result.toAnalyze).toHaveLength(3);
    expect(result.toSaveUnanalyzed).toHaveLength(5);
  });

  it("applies the cap ceiling after the floor", () => {
    const jobs = Array.from({ length: 10 }, () =>
      job({ title: "Frontend Engineer" }),
    );
    const result = runGreenhousePipeline(jobs, config, [], { k: 2, cap: 4 });
    expect(result.funnel.relevant).toBe(4);
    expect(
      result.toAnalyze.length + result.toSaveUnanalyzed.length,
    ).toBe(4);
  });

  it("omits the located stage when strictLocation is off", () => {
    const result = runGreenhousePipeline(
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
    const result = runGreenhousePipeline(
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
    const result = runGreenhousePipeline(jobs, config, [], { k: 2 });
    expect(result.toAnalyze[0].score).toBeGreaterThanOrEqual(
      result.toAnalyze[1].score,
    );
  });
});
