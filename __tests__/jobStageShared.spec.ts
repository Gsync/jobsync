import { sortStages } from "@/lib/jobs/sortStages";
import { jobFieldsForStage } from "@/actions/jobStage/shared";

const at = (iso: string) => new Date(iso);

describe("sortStages", () => {
  const stage = (
    id: string,
    sortOrder: number,
    occurredAt: Date | null,
    createdAt: Date,
  ) => ({ id, occurredAt, createdAt, StageType: { sortOrder } });

  // The Library -> Stages order wins over chronology: a job added days after
  // it was applied to has a New stage dated later than its Applied stage.
  it("orders by the stage type's sortOrder, not by date", () => {
    const stages = [
      stage("applied", 2, at("2026-09-14T18:00:49Z"), at("2026-09-19T00:00:00Z")),
      stage("new", 1, at("2026-09-14T18:11:06Z"), at("2026-09-19T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["new", "applied"]);
  });

  it("keeps New first when the job was applied to weeks earlier", () => {
    const stages = [
      stage("applied", 2, at("2026-08-29T09:00:00Z"), at("2026-09-14T00:00:00Z")),
      stage("new", 1, at("2026-09-14T18:11:06Z"), at("2026-09-14T00:00:00Z")),
      stage("withdrawn", 13, null, at("2026-09-18T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual([
      "new",
      "applied",
      "withdrawn",
    ]);
  });

  // SQLite sorts NULL first on ASC and Prisma's nulls:"last" is unsupported
  // there, so ordering lives here and must not migrate into the query.
  it("sorts undated stages last within one sortOrder", () => {
    const stages = [
      stage("c", 3, null, at("2026-01-01T00:00:00Z")),
      stage("b", 3, at("2026-09-10T00:00:00Z"), at("2026-01-01T00:00:00Z")),
      stage("a", 3, at("2026-09-01T00:00:00Z"), at("2026-01-01T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("breaks ties on createdAt when sortOrder and date both match", () => {
    const same = at("2026-09-10T00:00:00Z");
    const stages = [
      stage("second", 3, same, at("2026-02-01T00:00:00Z")),
      stage("first", 3, same, at("2026-01-01T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["first", "second"]);
  });

  it("orders several undated stages of one type by createdAt", () => {
    const stages = [
      stage("later", 3, null, at("2026-03-01T00:00:00Z")),
      stage("earlier", 3, null, at("2026-01-01T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual(["earlier", "later"]);
  });

  it("slots a backdated stage by its type, not by when it was entered", () => {
    const stages = [
      stage("new", 1, at("2026-09-01T00:00:00Z"), at("2026-09-01T00:00:00Z")),
      stage("onsite", 6, at("2026-09-24T00:00:00Z"), at("2026-09-02T00:00:00Z")),
      stage("screening", 4, at("2026-09-10T00:00:00Z"), at("2026-09-30T00:00:00Z")),
    ];
    expect(sortStages(stages).map((s) => s.id)).toEqual([
      "new",
      "screening",
      "onsite",
    ]);
  });

  it("does not mutate its input", () => {
    const stages = [
      stage("b", 3, at("2026-09-10T00:00:00Z"), at("2026-01-01T00:00:00Z")),
      stage("a", 1, at("2026-09-01T00:00:00Z"), at("2026-01-01T00:00:00Z")),
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
