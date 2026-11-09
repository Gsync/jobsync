import { vi } from "vitest";

export type TimelineRows = {
  jobStatus: { id: string; value: string }[];
  jobStageType: {
    id: string;
    value: string;
    label: string;
    statusId: string;
    sortOrder: number;
    createdBy: string;
  }[];
  job: {
    id: string;
    userId: string;
    statusId: string;
    applied: boolean;
    appliedDate: Date | null;
    createdVia: string | null;
    [k: string]: unknown;
  }[];
  jobStage: {
    id: string;
    jobId: string;
    stageTypeId: string;
    occurredAt: Date | null;
    isCurrent: boolean;
    createdAt: Date;
  }[];
};

type Row = Record<string, any>;
type Model = keyof TimelineRows;

const pgError = (code: string) => Object.assign(new Error(code), { code });

export function createTimelineDbFake(seed: TimelineRows) {
  const rows: TimelineRows = structuredClone(seed);
  const calls: Record<string, number> = {};
  const failures: Record<string, number> = {};
  let nextId = 1;

  // To-one relations resolve to a row, to-many to a list.
  const rel = (model: Model, name: string, row: Row): Row | Row[] | undefined => {
    if (model === "jobStage" && name === "Job")
      return rows.job.find((j) => j.id === row.jobId);
    if (model === "jobStage" && name === "StageType")
      return rows.jobStageType.find((t) => t.id === row.stageTypeId);
    if (model === "jobStageType" && name === "Status")
      return rows.jobStatus.find((s) => s.id === row.statusId);
    if (model === "job" && name === "Status")
      return rows.jobStatus.find((s) => s.id === row.statusId);
    if (model === "job" && name === "stages")
      return rows.jobStage.filter((s) => s.jobId === row.id);
    return undefined;
  };
  const relModel: Record<string, Model> = {
    Job: "job",
    StageType: "jobStageType",
    Status: "jobStatus",
    stages: "jobStage",
  };

  const match = (model: Model, row: Row, where: Row = {}): boolean =>
    Object.entries(where).every(([key, cond]) => {
      if (key === "NOT") return !match(model, row, cond);
      const related = rel(model, key, row);
      if (key in relModel) {
        if (Array.isArray(related))
          return related.some((r) => match(relModel[key], r, cond.some));
        return !!related && match(relModel[key], related as Row, cond);
      }
      const v = row[key];
      if (cond && typeof cond === "object" && !(cond instanceof Date)) {
        if ("not" in cond) return v !== cond.not;
        if ("in" in cond) return cond.in.includes(v);
      }
      return v === cond;
    });

  // Scalar select is ignored: whole rows, joined with StageType.Status.
  const shape = (model: Model, row: Row, args: Row = {}): Row => {
    const out: Row = { ...row };
    for (const name of ["Status", "StageType"]) {
      const r = rel(model, name, row) as Row | undefined;
      if (r) out[name] = model === "jobStage" ? shape("jobStageType", r) : r;
    }
    const nested = (args.select ?? args.include)?.stages;
    if (nested)
      out.stages = (rel(model, "stages", row) as Row[]).filter((s) =>
        match("jobStage", s, nested.where),
      );
    return out;
  };

  const hasTwoCurrent = () => {
    const jobIds = rows.jobStage.filter((s) => s.isCurrent).map((s) => s.jobId);
    return new Set(jobIds).size !== jobIds.length;
  };

  // Mirrors the partial unique index JobStage_jobId_current_key.
  const write = (model: Model, op: () => any) => {
    const before = structuredClone(rows[model]) as Row[];
    const result = op();
    if (model === "jobStage" && hasTwoCurrent()) {
      rows.jobStage.splice(0, rows.jobStage.length, ...(before as never[]));
      throw pgError("P2002");
    }
    return result;
  };

  const track = (model: Model, op: string) => {
    const key = `${model}.${op}`;
    calls[key] = (calls[key] ?? 0) + 1;
    if (failures[key] === calls[key]) throw new Error(`injected ${key}`);
  };

  const modelApi = (model: Model) => {
    const find = (a: Row = {}) => rows[model].find((r) => match(model, r, a.where));
    const api: Record<string, (a?: Row) => Promise<any>> = {
      findFirst: async (a) => {
        const r = find(a);
        return r ? shape(model, r, a) : null;
      },
      findUnique: async (a) => api.findFirst(a),
      findMany: async (a) =>
        rows[model]
          .filter((r) => match(model, r, a?.where))
          .map((r) => shape(model, r, a)),
      count: async (a) => rows[model].filter((r) => match(model, r, a?.where)).length,
      create: async (a) =>
        write(model, () => {
          const row = { id: `new-${nextId++}`, createdAt: new Date(), ...a!.data };
          rows[model].push(row as never);
          return shape(model, row);
        }),
      update: async (a) =>
        write(model, () => {
          const r = find(a);
          if (!r) throw pgError("P2025");
          Object.assign(r, a!.data);
          return shape(model, r);
        }),
      updateMany: async (a) =>
        write(model, () => {
          const hit = rows[model].filter((r) => match(model, r, a!.where));
          hit.forEach((r) => Object.assign(r, a!.data));
          return { count: hit.length };
        }),
    };
    return Object.fromEntries(
      Object.entries(api).map(([op, fn]) => [
        op,
        vi.fn(async (a?: Row) => {
          track(model, op);
          return fn(a);
        }),
      ]),
    );
  };

  const db: Row = {
    job: modelApi("job"),
    jobStage: modelApi("jobStage"),
    jobStageType: modelApi("jobStageType"),
    jobStatus: modelApi("jobStatus"),
    $transaction: vi.fn(async (fn: (tx: Row) => Promise<unknown>) => {
      const snapshot = structuredClone(rows);
      try {
        return await fn(db);
      } catch (error) {
        for (const m of Object.keys(rows) as Model[])
          rows[m].splice(0, rows[m].length, ...(snapshot[m] as never[]));
        throw error;
      }
    }),
  };

  return {
    db,
    rows,
    failOn(model: string, op: string, nth: number) {
      failures[`${model}.${op}`] = nth;
    },
  };
}
