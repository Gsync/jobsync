import { sortStages } from "@/lib/jobs/sortStages";
import { jobFieldsForStage } from "@/actions/jobStage/shared";

const at = (iso: string) => new Date(iso);

describe("sortStages", () => {
  // SQLite sorts NULL first on ASC and Prisma's nulls:"last" is unsupported
  // there, so ordering lives here and must not migrate into the query.
  it("orders by occurredAt ascending with undated stages last", () => {
    const stages = [
      { id: "c", occurredAt: null, createdAt: at("2026-01-01T00:00:00Z") },
      { id: "b", occurredAt: at("2026-09-10T00:00:00Z"), createdAt: at("2026-01-01T00:00:00Z") },
      { id: "a", occurredAt: at("2026-09-01T00:00:00Z"), createdAt: at("2026-01-01T00:00:00Z") },
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks ties on createdAt", () => {
    const same = at("2026-09-10T00:00:00Z");
    const stages = [
      { id: "second", occurredAt: same, createdAt: at("2026-02-01T00:00:00Z") },
      { id: "first", occurredAt: same, createdAt: at("2026-01-01T00:00:00Z") },
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["first", "second"]);
  });

  it("orders several undated stages by createdAt", () => {
    const stages = [
      { id: "later", occurredAt: null, createdAt: at("2026-03-01T00:00:00Z") },
      { id: "earlier", occurredAt: null, createdAt: at("2026-01-01T00:00:00Z") },
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["earlier", "later"]);
  });

  it("slots a backdated stage into the middle rather than rejecting it", () => {
    const stages = [
      { id: "new", occurredAt: at("2026-09-01T00:00:00Z"), createdAt: at("2026-09-01T00:00:00Z") },
      { id: "onsite", occurredAt: at("2026-09-24T00:00:00Z"), createdAt: at("2026-09-02T00:00:00Z") },
      { id: "backdated", occurredAt: at("2026-09-10T00:00:00Z"), createdAt: at("2026-09-30T00:00:00Z") },
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["new", "backdated", "onsite"]);
  });

  it("does not mutate its input", () => {
    const stages = [
      { id: "b", occurredAt: at("2026-09-10T00:00:00Z"), createdAt: at("2026-01-01T00:00:00Z") },
      { id: "a", occurredAt: at("2026-09-01T00:00:00Z"), createdAt: at("2026-01-01T00:00:00Z") },
    ];
    sortStages(stages);
    expect(stages.map((s) => s.id)).toEqual(["b", "a"]);
  });
});

describe("jobFieldsForStage", () => {
  it("writes only the status for a non-applied, non-interview stage", () => {
    expect(jobFieldsForStage("rejected", "s-rej", null, null)).toEqual({
      statusId: "s-rej",
    });
  });

  it("marks an interview stage as applied without touching appliedDate", () => {
    expect(jobFieldsForStage("interview", "s-int", null, null)).toEqual({
      statusId: "s-int",
      applied: true,
    });
  });

  it("sets appliedDate from the stage's own date when it has one", () => {
    const occurred = at("2026-09-03T00:00:00Z");
    expect(jobFieldsForStage("applied", "s-app", occurred, null)).toEqual({
      statusId: "s-app",
      applied: true,
      appliedDate: occurred,
    });
  });

  it("falls back to now for an undated applied stage", () => {
    const before = Date.now();
    const data = jobFieldsForStage("applied", "s-app", null, null) as any;
    expect(data.appliedDate.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("never overwrites an appliedDate already on the job", () => {
    const existing = at("2026-08-01T00:00:00Z");
    expect(
      jobFieldsForStage("applied", "s-app", at("2026-09-03T00:00:00Z"), existing),
    ).toEqual({ statusId: "s-app", applied: true });
  });
});
