import {
  createTimelineDbFake,
  type TimelineRows,
} from "./helpers/timelineDbFake";
import {
  changeJobStatus,
  changeStageTypeStatus,
  initialTimelineForNewJob,
  JobNotFoundError,
  setJobCurrentStage,
} from "@/lib/jobs/timeline";

const h = vi.hoisted(() => ({ fake: null as any, resolve: vi.fn() }));
vi.mock("@/lib/db", () => ({
  default: new Proxy({}, { get: (_t, key) => h.fake.db[key] }),
}));
vi.mock("@/lib/jobs/resolve", () => ({
  resolveStageTypeForStatusId: h.resolve,
}));

const VALUES = ["draft", "applied", "interview", "offer", "rejected"];
const backdated = new Date("2026-01-05T00:00:00Z");

const baseSeed = (): TimelineRows => ({
  jobStatus: VALUES.map((v) => ({ id: `s-${v}`, value: v })),
  jobStageType: VALUES.map((v, i) => ({
    id: `t-${v}`,
    value: v,
    label: v,
    statusId: `s-${v}`,
    sortOrder: i,
    createdBy: "u1",
  })),
  job: [],
  jobStage: [],
});

const job = (over: Record<string, unknown> = {}) => ({
  id: "j1",
  userId: "u1",
  statusId: "s-draft",
  applied: false,
  appliedDate: null,
  createdVia: "mcp" as string | null,
  ...over,
});

let stageN = 0;
const stage = (over: Record<string, unknown> = {}) => ({
  id: `st${++stageN}`,
  jobId: "j1",
  stageTypeId: "t-draft",
  occurredAt: backdated,
  isCurrent: true,
  createdAt: backdated,
  ...over,
});

function setup(patch: (seed: TimelineRows) => void = () => {}) {
  const seed = baseSeed();
  patch(seed);
  const before = structuredClone(seed);
  h.fake = createTimelineDbFake(seed);
  return { fake: h.fake as ReturnType<typeof createTimelineDbFake>, before };
}

const withJob = (over = {}, stages: Record<string, unknown>[] = []) =>
  (seed: TimelineRows) => {
    seed.job.push(job(over));
    seed.jobStage.push(...(stages as TimelineRows["jobStage"]));
  };

beforeEach(() => {
  stageN = 0;
  h.resolve.mockImplementation(async (statusId: string) =>
    statusId.replace("s-", "t-"),
  );
});

describe("changeJobStatus", () => {
  const call = (statusId: string, extra = {}) =>
    changeJobStatus({ jobId: "j1", userId: "u1", statusId, ...extra });

  it("appends nothing when the current stage's parent status already matches", async () => {
    const { fake } = setup(
      withJob({ statusId: "s-interview" }, [stage({ stageTypeId: "t-interview" })]),
    );
    fake.rows.jobStageType.push({
      id: "t-tech",
      value: "tech",
      label: "2nd Technical Interview",
      statusId: "s-interview",
      sortOrder: 9,
      createdBy: "u1",
    });
    fake.rows.jobStage[0].stageTypeId = "t-tech";

    await call("s-interview");

    expect(fake.rows.jobStage).toHaveLength(1);
    expect(fake.rows.job[0].statusId).toBe("s-interview");
  });

  it("appends a current stage dated now when the status changes", async () => {
    const { fake } = setup(withJob({}, [stage()]));

    await call("s-applied");

    const [old, added] = fake.rows.jobStage;
    expect(fake.rows.jobStage).toHaveLength(2);
    expect(old.isCurrent).toBe(false);
    expect(added).toMatchObject({ isCurrent: true, stageTypeId: "t-applied" });
    expect(Math.abs(added.occurredAt!.getTime() - Date.now())).toBeLessThan(1000);
  });

  it("resolves the stage type before opening the transaction", async () => {
    const { fake } = setup(withJob({}, [stage()]));

    await call("s-applied");

    expect(h.resolve.mock.invocationCallOrder[0]).toBeLessThan(
      fake.db.$transaction.mock.invocationCallOrder[0],
    );
  });

  it("appends a first stage for a stage-less job", async () => {
    const { fake } = setup(withJob());

    await call("s-applied");

    expect(fake.rows.jobStage).toHaveLength(1);
    expect(fake.rows.jobStage[0].isCurrent).toBe(true);
  });

  it("adds no stage to a stage-less job whose status is unchanged", async () => {
    const { fake } = setup(withJob());

    await call("s-draft");

    expect(fake.rows.jobStage).toHaveLength(0);
  });

  it("refuses another user's job before writing anything", async () => {
    const { fake, before } = setup(withJob({ userId: "u2" }, [stage()]));

    await expect(call("s-applied")).rejects.toBeInstanceOf(JobNotFoundError);

    expect(fake.rows).toEqual(before);
  });

  it("refuses a hand-added job when requireCreatedVia is set", async () => {
    const { fake, before } = setup(withJob({ createdVia: null }, [stage()]));

    await expect(
      call("s-applied", { requireCreatedVia: true, jobFields: { salaryRange: "1" } }),
    ).rejects.toBeInstanceOf(JobNotFoundError);

    expect(fake.rows).toEqual(before);
  });

  it('updates the same job when createdVia is "mcp"', async () => {
    const { fake } = setup(withJob({ createdVia: "mcp" }, [stage()]));

    await call("s-applied", { requireCreatedVia: true });

    expect(fake.rows.job[0].statusId).toBe("s-applied");
  });

  it("writes applied and appliedDate for an Applied pick", async () => {
    const { fake } = setup(withJob({}, [stage()]));

    await call("s-applied");

    expect(fake.rows.job[0].applied).toBe(true);
    expect(fake.rows.job[0].appliedDate).toBeInstanceOf(Date);
  });

  it("never moves an appliedDate the job already has", async () => {
    const { fake } = setup(
      withJob({ appliedDate: backdated, applied: true }, [stage()]),
    );

    await call("s-applied");

    expect(fake.rows.job[0].appliedDate).toEqual(backdated);
  });

  it("leaves applied alone for a status that doesn't imply applying", async () => {
    const { fake } = setup(withJob({}, [stage()]));

    await call("s-rejected");

    expect(fake.rows.job[0].applied).toBe(false);
  });

  it("saves jobFields in the same update", async () => {
    const { fake } = setup(withJob({}, [stage()]));

    await call("s-offer", { jobFields: { jobTitleId: "title-2" } });

    expect(fake.rows.job[0]).toMatchObject({
      jobTitleId: "title-2",
      statusId: "s-offer",
    });
  });

  it("rolls back the new stage when the job update fails", async () => {
    const { fake, before } = setup(withJob({}, [stage()]));
    fake.failOn("job", "update", 1);

    await expect(call("s-applied")).rejects.toThrow("injected job.update");

    expect(fake.rows).toEqual(before);
  });

  describe("Edit Job mode", () => {
    const edit = (statusId: string, date: Date | null = null) =>
      call(statusId, { appliedDateFromUser: date });

    it("keeps an Interview job applied when it has no date", async () => {
      const { fake } = setup(
        withJob({ statusId: "s-interview" }, [stage({ stageTypeId: "t-interview" })]),
      );

      await edit("s-interview");

      expect(fake.rows.job[0]).toMatchObject({ applied: true, appliedDate: null });
    });

    it("un-applies a job whose date is cleared and was never applied to", async () => {
      const { fake } = setup(
        withJob({ applied: true, appliedDate: backdated }, [stage()]),
      );

      await edit("s-draft");

      expect(fake.rows.job[0]).toMatchObject({ applied: false, appliedDate: null });
    });

    it("keeps a job applied when an earlier stage was an applying one", async () => {
      const { fake } = setup(
        withJob({ statusId: "s-rejected" }, [
          stage({ stageTypeId: "t-applied", isCurrent: false }),
          stage({ stageTypeId: "t-rejected" }),
        ]),
      );

      await edit("s-rejected");

      expect(fake.rows.job[0].applied).toBe(true);
    });

    it("does not date an Applied job on a save that keeps its status", async () => {
      const { fake } = setup(
        withJob({ statusId: "s-applied", applied: true }, [
          stage({ stageTypeId: "t-applied" }),
        ]),
      );

      await edit("s-applied");

      expect(fake.rows.job[0]).toMatchObject({ applied: true, appliedDate: null });
    });

    it("dates a job when the save moves it to Applied without a date", async () => {
      const { fake } = setup(withJob({}, [stage()]));

      await edit("s-applied");

      expect(fake.rows.job[0].applied).toBe(true);
      expect(fake.rows.job[0].appliedDate).toBeInstanceOf(Date);
    });
  });
});

describe("setJobCurrentStage", () => {
  const promote = (
    fake: ReturnType<typeof createTimelineDbFake>,
    stageId: string,
    jobId = "j1",
  ) =>
    fake.db.$transaction((tx: any) =>
      setJobCurrentStage(tx, { jobId, stageId, userId: "u1" }),
    );

  it("promotes the stage and rewrites the job status from its type", async () => {
    const { fake } = setup(
      withJob({}, [
        stage({ id: "a" }),
        stage({ id: "b", stageTypeId: "t-interview", isCurrent: false }),
      ]),
    );

    await promote(fake, "b");

    expect(fake.rows.jobStage.map((r) => r.isCurrent)).toEqual([false, true]);
    expect(fake.rows.job[0]).toMatchObject({
      statusId: "s-interview",
      applied: true,
    });
  });

  it("sets appliedDate from a backdated applied stage", async () => {
    const when = new Date("2026-02-01T00:00:00Z");
    const { fake } = setup(
      withJob({}, [
        stage({ id: "a" }),
        stage({
          id: "b",
          stageTypeId: "t-applied",
          occurredAt: when,
          isCurrent: false,
        }),
      ]),
    );

    await promote(fake, "b");

    expect(fake.rows.job[0].appliedDate).toEqual(when);
  });

  it("re-derives the status when the current stage's type was edited", async () => {
    const { fake } = setup(withJob({}, [stage({ id: "a" })]));
    fake.rows.jobStage[0].stageTypeId = "t-offer";

    await promote(fake, "a");

    expect(fake.rows.job[0].statusId).toBe("s-offer");
  });

  it("refuses another user's stage and changes nothing", async () => {
    const { fake, before } = setup((seed) => {
      withJob({}, [stage({ id: "a" })])(seed);
      seed.job.push(job({ id: "j9", userId: "u2" }));
      seed.jobStage.push(stage({ id: "z", jobId: "j9" }) as never);
    });

    await expect(promote(fake, "z", "j9")).rejects.toThrow("Stage not found");

    expect(fake.rows).toEqual(before);
  });

  it("refuses a stage from another job of the same user and rolls back the clear", async () => {
    const { fake, before } = setup((seed) => {
      withJob({}, [stage({ id: "a" })])(seed);
      seed.job.push(job({ id: "j2", statusId: "s-offer" }));
      seed.jobStage.push(
        stage({ id: "b", jobId: "j2", stageTypeId: "t-offer" }) as never,
      );
    });

    await expect(promote(fake, "b")).rejects.toThrow("Stage not found");

    expect(fake.rows).toEqual(before);
  });

  it("scopes the clear step to the owner", async () => {
    const { fake } = setup(
      withJob({}, [stage({ id: "a" }), stage({ id: "b", isCurrent: false })]),
    );

    await promote(fake, "b");

    expect(fake.db.jobStage.updateMany.mock.calls[0][0].where).toEqual({
      jobId: "j1",
      isCurrent: true,
      NOT: { id: "b" },
      Job: { userId: "u1" },
    });
  });
});

describe("changeStageTypeStatus", () => {
  const takeHome = {
    id: "t-take",
    value: "take-home",
    label: "Take-home",
    statusId: "s-interview",
    sortOrder: 5,
    createdBy: "u1",
  };
  const onTakeHome = (id: string, over = {}) => [
    job({ id, statusId: "s-interview", ...over }),
    stage({ jobId: id, stageTypeId: "t-take" }),
  ];
  const retarget = (statusId = "s-applied") =>
    changeStageTypeStatus({
      stageTypeId: "t-take",
      userId: "u1",
      statusId,
      label: "Take-home",
      sortOrder: 5,
    });

  it("re-derives every job sitting on the type", async () => {
    const { fake } = setup((seed) => {
      seed.jobStageType.push(takeHome);
      for (const id of ["j1", "j2", "j3"]) {
        const [j, st] = onTakeHome(id);
        seed.job.push(j as never);
        seed.jobStage.push(st as never);
      }
    });

    await retarget();

    expect(fake.rows.jobStageType.find((t) => t.id === "t-take")?.statusId).toBe(
      "s-applied",
    );
    expect(fake.rows.job.map((j) => j.statusId)).toEqual([
      "s-applied",
      "s-applied",
      "s-applied",
    ]);
  });

  it("leaves jobs whose current stage has another type alone", async () => {
    const { fake } = setup((seed) => {
      seed.jobStageType.push(takeHome);
      seed.job.push(job({ statusId: "s-interview" }));
      seed.jobStage.push(
        stage({ stageTypeId: "t-take", isCurrent: false }) as never,
        stage({ stageTypeId: "t-interview" }) as never,
      );
    });

    await retarget();

    expect(fake.rows.job[0].statusId).toBe("s-interview");
  });

  it("dates the job from its current stage, not an older one", async () => {
    const current = new Date("2026-03-03T00:00:00Z");
    const older = new Date("2026-01-01T00:00:00Z");
    const { fake } = setup((seed) => {
      seed.jobStageType.push(takeHome);
      seed.job.push(job({ statusId: "s-interview" }));
      seed.jobStage.push(
        stage({
          stageTypeId: "t-draft",
          occurredAt: older,
          isCurrent: false,
        }) as never,
        stage({ stageTypeId: "t-take", occurredAt: current }) as never,
      );
    });

    await retarget();

    expect(fake.rows.job[0].appliedDate).toEqual(current);
  });

  it("rolls back the type and every job when one job update fails", async () => {
    const { fake, before } = setup((seed) => {
      seed.jobStageType.push(takeHome);
      for (const id of ["j1", "j2", "j3"]) {
        const [j, st] = onTakeHome(id);
        seed.job.push(j as never);
        seed.jobStage.push(st as never);
      }
    });
    fake.failOn("job", "update", 2);

    await expect(retarget()).rejects.toThrow("injected job.update");

    expect(fake.rows).toEqual(before);
  });
});

describe("initialTimelineForNewJob", () => {
  const when = new Date("2026-09-19T00:00:00Z");

  it("returns one current stage dated at occurredAt", async () => {
    setup();

    const result = await initialTimelineForNewJob({
      statusId: "s-draft",
      userId: "u1",
      occurredAt: when,
    });

    expect(h.resolve).toHaveBeenCalledWith("s-draft", "u1");
    expect(result.stages).toEqual({
      create: { stageTypeId: "t-draft", occurredAt: when, isCurrent: true },
    });
  });

  it("derives applied fields for an Applied start", async () => {
    setup();

    const { jobFields } = await initialTimelineForNewJob({
      statusId: "s-applied",
      userId: "u1",
      occurredAt: when,
    });

    expect(jobFields).toMatchObject({ statusId: "s-applied", applied: true });
    expect(jobFields.appliedDate).toBeInstanceOf(Date);
  });

  it("returns only statusId for a New start", async () => {
    setup((seed) => seed.jobStatus.push({ id: "s-new", value: "new" }));

    const { jobFields } = await initialTimelineForNewJob({
      statusId: "s-new",
      userId: "u1",
      occurredAt: when,
    });

    expect(jobFields).toEqual({ statusId: "s-new" });
  });
});
