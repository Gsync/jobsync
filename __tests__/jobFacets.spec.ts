import {
  EMPTY_JOB_FACETS,
  countJobFacets,
  hasJobFacets,
  normalizeJobFacets,
  parseJobFacets,
  writeJobFacets,
} from "@/lib/jobs/jobFacets";

describe("jobFacets", () => {
  describe("parseJobFacets", () => {
    it("returns empty facets for a bare URL", () => {
      expect(parseJobFacets(new URLSearchParams())).toEqual(EMPTY_JOB_FACETS);
    });

    it("reads every facet param", () => {
      const params = new URLSearchParams(
        "status=applied,interview&accepted=1&type=FT,C&workplace=REMOTE&dismissed=1",
      );
      expect(parseJobFacets(params)).toEqual({
        statuses: ["applied", "interview"],
        acceptedDiscovered: true,
        jobTypes: ["FT", "C"],
        workplaces: ["REMOTE"],
        includeDismissed: true,
      });
    });

    it("drops unknown and duplicate values", () => {
      const params = new URLSearchParams(
        "status=bogus,applied,applied&type=fulltime&workplace=REMOTE,REMOTE&accepted=yes",
      );
      expect(parseJobFacets(params)).toEqual({
        ...EMPTY_JOB_FACETS,
        statuses: ["applied"],
        workplaces: ["REMOTE"],
      });
    });

    it("reads comma lists that were percent-encoded", () => {
      const params = new URLSearchParams("status=applied%2Cinterview");
      expect(parseJobFacets(params).statuses).toEqual(["applied", "interview"]);
    });
  });

  describe("normalizeJobFacets", () => {
    it("orders values canonically so equal picks compare equal", () => {
      const a = normalizeJobFacets({ statuses: ["interview", "applied"] });
      const b = normalizeJobFacets({ statuses: ["applied", "interview"] });
      expect(a).toEqual(b);
    });

    it("fills missing keys from empty", () => {
      expect(normalizeJobFacets(undefined)).toEqual(EMPTY_JOB_FACETS);
    });
  });

  describe("writeJobFacets", () => {
    it("keeps unrelated params and removes cleared facets", () => {
      const before = new URLSearchParams(
        "company=google&applied=true&status=draft&dismissed=1",
      );
      const after = writeJobFacets(before, {
        ...EMPTY_JOB_FACETS,
        workplaces: ["HYBRID"],
      });
      expect(after.get("company")).toBe("google");
      expect(after.get("applied")).toBe("true");
      expect(after.get("workplace")).toBe("HYBRID");
      expect(after.has("status")).toBe(false);
      expect(after.has("dismissed")).toBe(false);
      expect(before.get("status")).toBe("draft");
    });

    it("round-trips through parseJobFacets", () => {
      const facets = {
        statuses: ["applied", "offer"],
        acceptedDiscovered: true,
        jobTypes: ["PT"],
        workplaces: ["REMOTE", "ONSITE"],
        includeDismissed: false,
      };
      const params = writeJobFacets(new URLSearchParams(), facets);
      expect(parseJobFacets(params)).toEqual(facets);
    });
  });

  describe("countJobFacets", () => {
    it("counts values, with one each for the two flags", () => {
      expect(
        countJobFacets({
          statuses: ["applied", "interview"],
          acceptedDiscovered: true,
          jobTypes: ["FT"],
          workplaces: ["REMOTE"],
          includeDismissed: true,
        }),
      ).toBe(6);
      expect(hasJobFacets(EMPTY_JOB_FACETS)).toBe(false);
    });
  });
});
