import { copyAll, type CopyClient } from "../scripts/import/copy";
import type { ImportPlan } from "../scripts/import/order";

type Row = Record<string, unknown> & { id: string };

function memoryClient(tables: Record<string, Row[]>, joins: Record<string, { A: string; B: string }[]> = {}) {
  const calls: { op: string; table: string; size?: number }[] = [];
  const delegate = (name: string) => ({
    findMany: async ({ take, cursor }: { take: number; cursor?: { id: string } }) => {
      const rows = [...(tables[name] ?? [])].sort((x, y) => (x.id < y.id ? -1 : 1));
      const start = cursor ? rows.findIndex((r) => r.id === cursor.id) + 1 : 0;
      return rows.slice(start, start + take);
    },
    count: async () => (tables[name] ?? []).length,
    createMany: async ({ data, skipDuplicates }: { data: Row[]; skipDuplicates: boolean }) => {
      expect(skipDuplicates).toBe(true);
      calls.push({ op: "createMany", table: name, size: data.length });
      const existing = (tables[name] ??= []);
      for (const row of data) if (!existing.some((r) => r.id === row.id)) existing.push({ ...row });
    },
    update: async ({ where, data }: { where: { id: string }; data: Row }) => {
      calls.push({ op: "update", table: name });
      Object.assign(tables[name].find((r) => r.id === where.id)!, data);
    },
  });
  const client: CopyClient = new Proxy(
    {
      $queryRawUnsafe: async (sql: string) => {
        const table = /"(_\w+)"/.exec(sql)![1];
        if (sql.startsWith("SELECT COUNT")) return [{ n: BigInt((joins[table] ?? []).length) }];
        return joins[table] ?? [];
      },
      $executeRawUnsafe: async (sql: string, ...values: string[]) => {
        expect(sql).toContain("ON CONFLICT DO NOTHING");
        const table = /"(_\w+)"/.exec(sql)![1];
        calls.push({ op: "insertJoin", table, size: values.length / 2 });
        const existing = (joins[table] ??= []);
        for (let i = 0; i < values.length; i += 2) {
          const pair = { A: values[i], B: values[i + 1] };
          if (!existing.some((p) => p.A === pair.A && p.B === pair.B)) existing.push(pair);
        }
        return values.length / 2;
      },
    } as Record<string, unknown>,
    { get: (target, key: string) => target[key] ?? (target[key] = delegate(key)) },
  );
  return { client, tables, joins, calls };
}

const plan: ImportPlan = {
  order: ["User", "Resume", "Tag", "Job"],
  joinTables: [{ table: "_JobToTag", a: "Job", b: "Tag" }],
  deferred: [{ model: "User", field: "defaultResumeId" }],
};

const sourceData = () =>
  memoryClient(
    {
      user: [{ id: "u1", email: "a@b.c", defaultResumeId: "r1" }, { id: "u2", email: "d@e.f", defaultResumeId: null }],
      resume: [{ id: "r1", title: "CV" }],
      tag: [{ id: "t1", label: "Remote" }],
      job: [
        { id: "j1", description: "one" },
        { id: "j2", description: "bad\u0000byte" },
        { id: "j3", description: "three" },
      ],
    },
    { _JobToTag: [{ A: "j1", B: "t1" }, { A: "j2", B: "t1" }, { A: "j3", B: "t1" }] },
  );

describe("copyAll", () => {
  it("copies every table and join table and reports matching counts", async () => {
    const source = sourceData();
    const target = memoryClient({});
    const result = await copyAll(source.client, target.client, plan, () => {});
    expect(result.tables).toEqual([
      { name: "User", source: 2, target: 2 },
      { name: "Resume", source: 1, target: 1 },
      { name: "Tag", source: 1, target: 1 },
      { name: "Job", source: 3, target: 3 },
      { name: "_JobToTag", source: 3, target: 3 },
    ]);
  });

  it("inserts the deferred column as null, then sets it after Resume lands", async () => {
    const source = sourceData();
    const target = memoryClient({});
    await copyAll(source.client, target.client, plan, () => {});
    const order = target.calls.map((c) => `${c.op}:${c.table}`);
    expect(order.indexOf("update:user")).toBeGreaterThan(order.indexOf("createMany:resume"));
    expect(target.calls.filter((c) => c.op === "update")).toHaveLength(1);
    expect(target.tables.user.find((u) => u.id === "u1")!.defaultResumeId).toBe("r1");
    expect(target.tables.user.find((u) => u.id === "u2")!.defaultResumeId).toBeNull();
  });

  it("chunks reads, writes and join inserts by the batch size", async () => {
    const source = sourceData();
    const target = memoryClient({});
    await copyAll(source.client, target.client, plan, () => {}, 2);
    expect(target.calls.filter((c) => c.table === "job").map((c) => c.size)).toEqual([2, 1]);
    expect(target.calls.filter((c) => c.op === "insertJoin").map((c) => c.size)).toEqual([2, 1]);
  });

  it("sanitises strings and logs each value touched", async () => {
    const source = sourceData();
    const target = memoryClient({});
    const log: string[] = [];
    const result = await copyAll(source.client, target.client, plan, (line) => log.push(line));
    expect(target.tables.job.find((j) => j.id === "j2")!.description).toBe("badbyte");
    expect(result.sanitized).toBe(1);
    expect(log).toContain("Sanitised Job.description on row j2 (removed characters Postgres cannot store)");
  });

  it("inserts nothing new when run a second time", async () => {
    const source = sourceData();
    const target = memoryClient({});
    await copyAll(source.client, target.client, plan, () => {});
    const result = await copyAll(source.client, target.client, plan, () => {});
    expect(result.tables.every((t) => t.source === t.target)).toBe(true);
    expect(target.tables.job).toHaveLength(3);
    expect(target.joins._JobToTag).toHaveLength(3);
  });

  it("aborts on a count mismatch, naming the table", async () => {
    const source = sourceData();
    const target = memoryClient({ tag: [{ id: "stray", label: "Left over" }] });
    await expect(copyAll(source.client, target.client, plan, () => {})).rejects.toThrow(
      /Row counts differ after the copy: Tag \(1 in SQLite, 2 in Postgres\)/,
    );
  });

  it("names the model when an insert fails", async () => {
    const source = sourceData();
    const target = memoryClient({});
    target.client.job.createMany = async () => {
      throw new Error("Foreign key constraint violated: Job_companyId_fkey");
    };
    await expect(copyAll(source.client, target.client, plan, () => {})).rejects.toThrow(
      "Import failed while copying Job: Foreign key constraint violated: Job_companyId_fkey",
    );
  });
});
