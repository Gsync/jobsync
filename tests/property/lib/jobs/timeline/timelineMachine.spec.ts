import fc from "fast-check";
import {
  createTimelineDbFake,
  type TimelineRows,
} from "../../../../unit/lib/jobs/timeline/helpers/timelineDbFake";
import { changeJobStatus, JobNotFoundError } from "@/lib/jobs/timeline";
import {
  addJobStage,
  deleteJobStage,
  setCurrentJobStage,
} from "@/actions/jobStage.actions";
import { updateJobStageType } from "@/actions/jobStageType.actions";

const h = vi.hoisted(() => ({ fake: null as any, actor: "u1" }));
vi.mock("@/lib/db", () => ({
  default: new Proxy({}, { get: (_t, key) => h.fake.db[key] }),
}));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveStageTypeForStatusId: async (statusId: string, userId: string) =>
    statusId.replace("s-", `t-${userId}-`),
  resolveJobStageType: vi.fn(),
}));
vi.mock("@/actions/shared", () => ({
  requireUser: async () => ({ id: h.actor }),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const USERS = ["u1", "u2"];
const STATUSES = ["draft", "applied", "interview", "offer", "rejected"];
const at = new Date("2026-01-05T00:00:00Z");

const seed = (): TimelineRows => {
  const rows: TimelineRows = {
    jobStatus: STATUSES.map((v) => ({
      id: `s-${v}`,
      value: v,
      label: v[0].toUpperCase() + v.slice(1),
    })),
    jobStageType: [],
    job: [],
    jobStage: [],
  };
  USERS.forEach((u) => {
    STATUSES.forEach((v, i) =>
      rows.jobStageType.push({
        id: `t-${u}-${v}`,
        value: v,
        label: v,
        statusId: `s-${v}`,
        sortOrder: i,
        createdBy: u,
      }),
    );
    rows.jobStageType.push({
      id: `t-${u}-phone-screen`,
      value: "phone screen",
      label: "Phone screen",
      statusId: "s-interview",
      sortOrder: 2,
      createdBy: u,
    });
    ["a", "b"].forEach((n) => {
      const id = `j-${u}-${n}`;
      rows.job.push({
        id,
        userId: u,
        statusId: "s-draft",
        applied: false,
        appliedDate: null,
        createdVia: "mcp",
      });
      rows.jobStage.push({
        id: `st-${id}`,
        jobId: id,
        stageTypeId: `t-${u}-draft`,
        occurredAt: at,
        isCurrent: true,
        createdAt: at,
      });
    });
  });
  return rows;
};

const KINDS = [
  "changeJobStatus",
  "setCurrentJobStage",
  "addJobStage",
  "deleteJobStage",
  "updateJobStageType",
] as const;

const op = fc.record({
  kind: fc.constantFrom(...KINDS),
  actor: fc.constantFrom(0, 1),
  // Unbiased, so picks reach every job, stage and type
  pick: fc.noBias(fc.nat(1000)),
  statusPick: fc.noBias(fc.nat(1000)),
  setAsCurrent: fc.boolean(),
  dated: fc.boolean(),
});
type Op = typeof op extends fc.Arbitrary<infer T> ? T : never;

type Rows = TimelineRows;
const jobOwner = (rows: Rows, jobId: string) =>
  rows.job.find((j) => j.id === jobId)?.userId;

// Everything the actor does not own, to prove an op never touches it
const foreign = (rows: Rows, actor: string) => ({
  jobs: rows.job.filter((j) => j.userId !== actor),
  stages: rows.jobStage.filter((s) => jobOwner(rows, s.jobId) !== actor),
  types: rows.jobStageType.filter((t) => t.createdBy !== actor),
});

type Outcome = { ok: boolean; retargeted?: boolean };

// Runs the op and says whether the actor owned every row it named
async function run(o: Op, rows: Rows): Promise<Outcome & { own: boolean }> {
  const pickOf = <T>(list: T[]) => list[o.pick % list.length];
  const statusId = `s-${STATUSES[o.statusPick % STATUSES.length]}`;
  const actor = USERS[o.actor];
  const date = o.dated ? new Date(Date.UTC(2026, 1, 1 + (o.statusPick % 28))) : null;

  if (o.kind === "changeJobStatus") {
    const job = pickOf(rows.job);
    const own = job.userId === actor;
    try {
      await changeJobStatus({ jobId: job.id, userId: actor, statusId });
      return { own, ok: true };
    } catch (error) {
      expect(error).toBeInstanceOf(JobNotFoundError);
      return { own, ok: false };
    }
  }
  if (o.kind === "addJobStage") {
    const job = pickOf(rows.job);
    const type = rows.jobStageType[o.statusPick % rows.jobStageType.length];
    const res = await addJobStage({
      jobId: job.id,
      stageTypeId: type.id,
      date,
      setAsCurrent: o.setAsCurrent,
    });
    const own = job.userId === actor && type.createdBy === actor;
    return { own, ok: res.success };
  }
  if (o.kind === "updateJobStageType") {
    const type = pickOf(rows.jobStageType);
    const own = type.createdBy === actor;
    // Read before the call: the fake hands out live rows
    const changed = type.statusId !== statusId;
    const res = await updateJobStageType(
      type.id,
      type.label,
      statusId,
      type.sortOrder,
    );
    const named = STATUSES.includes(type.value);
    return { own: own && !(named && changed), ok: res.success, retargeted: own && !named && changed };
  }
  const stage = pickOf(rows.jobStage);
  const own = jobOwner(rows, stage.jobId) === actor;
  const act = o.kind === "setCurrentJobStage" ? setCurrentJobStage : deleteJobStage;
  const res = await act(stage.id);
  return { own, ok: res.success };
}

function expectInvariants(rows: Rows, before: Rows) {
  for (const job of rows.job) {
    const stages = rows.jobStage.filter((s) => s.jobId === job.id);
    const current = stages.filter((s) => s.isCurrent);
    expect(current.length).toBeLessThanOrEqual(1);
    if (current[0]) {
      const type = rows.jobStageType.find((t) => t.id === current[0].stageTypeId);
      expect(job.statusId).toBe(type?.statusId);
    }
    const was = before.job.find((j) => j.id === job.id)!.appliedDate;
    if (was) expect(job.appliedDate).toEqual(was);
  }
}

describe("job timeline state machine", () => {
  beforeAll(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("keeps the derived-status invariants under any op sequence", async () => {
    let retargets = 0;
    await fc.assert(
      fc.asyncProperty(fc.array(op, { minLength: 5, maxLength: 25 }), async (ops) => {
        h.fake = createTimelineDbFake(seed());
        const rows: Rows = h.fake.rows;
        for (const o of ops) {
          const actor = USERS[o.actor];
          h.actor = actor;
          const before = structuredClone(rows);
          if (rows.jobStage.length === 0 && /Stage$/.test(o.kind) && o.kind !== "addJobStage") continue;

          const res = await run(o, rows);

          expectInvariants(rows, before);
          expect(foreign(rows, actor)).toEqual(foreign(before, actor));
          expect(res.ok).toBe(res.own);
          if (!res.ok) expect(rows).toEqual(before);
          if (res.retargeted && res.ok) retargets++;
        }
      }),
      { numRuns: 100 },
    );
    expect(retargets).toBeGreaterThan(0);
  });
});
