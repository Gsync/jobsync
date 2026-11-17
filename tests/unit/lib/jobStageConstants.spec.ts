import { JOB_STAGES, JOB_STATUSES } from "@/lib/constants";
import { canonicalizeEntityValue } from "@/lib/jobs/canonicalize";
import { JOB_STATUS_BADGE_COLORS } from "@/lib/badge-colors";

describe("JOB_STAGES", () => {
  it("has fourteen entries with unique values and sequential sortOrder", () => {
    expect(JOB_STAGES).toHaveLength(14);
    const values = JOB_STAGES.map((s) => s.value);
    expect(new Set(values).size).toBe(14);
    expect(JOB_STAGES.map((s) => s.sortOrder)).toEqual(
      JOB_STAGES.map((_, i) => i),
    );
  });

  it("stores each value as the canonical form of its own label", () => {
    for (const stage of JOB_STAGES) {
      expect(stage.value).toBe(canonicalizeEntityValue(stage.label));
    }
  });

  it("points every stage at a real JobStatus value", () => {
    const statuses = new Set<string>(JOB_STATUSES.map((s) => s.value));
    for (const stage of JOB_STAGES) {
      expect(statuses.has(stage.status)).toBe(true);
    }
  });

  // Decision 19: the mapping must be total in both directions, so every
  // status has exactly one status-named stage type to resolve back to.
  it("carries exactly one status-named stage per JobStatus", () => {
    for (const status of JOB_STATUSES) {
      const named = JOB_STAGES.filter(
        (s) => s.value === canonicalizeEntityValue(status.label),
      );
      expect(named).toHaveLength(1);
      expect(named[0].status).toBe(status.value);
    }
  });

  it("adds withdrawn as an appended status with a slate badge", () => {
    expect(JOB_STATUSES[JOB_STATUSES.length - 1]).toEqual({
      label: "Withdrawn",
      value: "withdrawn",
    });
    expect(JOB_STATUS_BADGE_COLORS.withdrawn).toBe("slate");
  });
});
