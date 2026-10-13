import { LAST_SQLITE_MIGRATION } from "../scripts/import/decide";
import { runImport, type ImportDeps } from "../scripts/import/run";

const MODELS = [
  { name: "User", fields: [{ name: "id", kind: "scalar", type: "String", isList: false, isId: true }] },
];

function harness(over: {
  env?: Record<string, string>;
  files?: Record<string, string>;
  targetUsers?: number;
  sourceUsers?: { id: string }[];
  migrations?: string[];
  failCopy?: boolean;
  failWrite?: boolean;
} = {}) {
  const files: Record<string, string> = { "/data/dev.db": "sqlite", ...over.files };
  const log: string[] = [];
  const targetRows: { id: string }[] = Array.from({ length: over.targetUsers ?? 0 }, (_, i) => ({ id: `t${i}` }));
  const sourceRows = over.sourceUsers ?? [{ id: "u1" }, { id: "u2" }];
  let committed = false;
  let opened = 0;

  const userDelegate = (rows: { id: string }[]) => ({
    count: async () => rows.length,
    findMany: async ({ cursor }: { cursor?: { id: string } }) => (cursor ? [] : rows),
    createMany: async ({ data }: { data: { id: string }[] }) => {
      if (over.failCopy) throw new Error("Foreign key constraint violated");
      rows.push(...data);
    },
  });

  const target: any = {
    user: userDelegate(targetRows),
    $transaction: async (fn: (tx: any) => Promise<unknown>, options: unknown) => {
      expect(options).toEqual({ timeout: 300_000, maxWait: 300_000 });
      const before = [...targetRows];
      try {
        const result = await fn(target);
        committed = true;
        return result;
      } catch (error) {
        targetRows.length = 0;
        targetRows.push(...before);
        throw error;
      }
    },
  };

  const deps: ImportDeps = {
    env: over.env ?? {},
    fileExists: (p) => p in files,
    readText: (p) => files[p],
    writeText: (p, text) => {
      if (over.failWrite) throw new Error("EACCES: permission denied");
      files[p] = text;
    },
    openSource: (url) => {
      opened++;
      expect(url).toBe(`file:${over.env?.SQLITE_LEGACY_PATH ?? "/data/dev.db"}`);
      return {
        user: userDelegate(sourceRows),
        $queryRawUnsafe: async () =>
          (over.migrations ?? [LAST_SQLITE_MIGRATION]).map((migration_name) => ({ migration_name })),
        $disconnect: async () => {},
      };
    },
    target,
    models: MODELS,
    log: (line) => log.push(line),
    now: () => new Date("2026-11-02T14:02:11.000Z"),
  };

  return { deps, files, log, targetRows, opened: () => opened, committed: () => committed };
}

describe("runImport", () => {
  it("imports, reports per table and writes the sentinel", async () => {
    const h = harness();
    expect(await runImport(h.deps)).toBe(0);
    expect(h.targetRows).toHaveLength(2);
    expect(h.log).toContain("User: 2 → 2 ✓");
    expect(h.log.some((l) => l.startsWith("Import complete: 2 rows across 1 tables"))).toBe(true);
    expect(h.files["/data/dev.db.imported-at"]).toBe("2026-11-02T14:02:11.000Z\n");
    expect(h.files["/data/dev.db"]).toBe("sqlite");
  });

  it("skips a fresh install without opening anything", async () => {
    const h = harness({ files: {} });
    delete h.files["/data/dev.db"];
    expect(await runImport(h.deps)).toBe(0);
    expect(h.opened()).toBe(0);
  });

  it("is a no-op on a normal boot", async () => {
    const h = harness({ targetUsers: 3, files: { "/data/dev.db.imported-at": "2026-11-02T14:02:11.000Z\n" } });
    expect(await runImport(h.deps)).toBe(0);
    expect(h.opened()).toBe(0);
    expect(h.targetRows).toHaveLength(3);
  });

  it("stops on a lost volume", async () => {
    const h = harness({ files: { "/data/dev.db.imported-at": "2026-11-02T14:02:11.000Z\n" } });
    expect(await runImport(h.deps)).toBe(1);
    expect(h.log.join("\n")).toContain("The database it was imported into appears to be missing.");
    expect(h.opened()).toBe(0);
  });

  it("stops on data with no sentinel", async () => {
    const h = harness({ targetUsers: 1 });
    expect(await runImport(h.deps)).toBe(1);
    expect(h.log.join("\n")).toContain("never confirmed imported");
  });

  it("boots past everything with SKIP_IMPORT, loudly", async () => {
    const h = harness({ env: { SKIP_IMPORT: "1" } });
    expect(await runImport(h.deps)).toBe(0);
    expect(h.log.join("\n")).toContain("has not been migrated");
    expect(h.targetRows).toHaveLength(0);
  });

  it("honours SQLITE_LEGACY_PATH for the file and the sentinel", async () => {
    const h = harness({ env: { SQLITE_LEGACY_PATH: "/mnt/old.db" }, files: { "/mnt/old.db": "sqlite" } });
    expect(await runImport(h.deps)).toBe(0);
    expect(h.files["/mnt/old.db.imported-at"]).toBeDefined();
  });

  it("stops on an older legacy schema", async () => {
    const h = harness({ migrations: ["20240524022540_init"] });
    expect(await runImport(h.deps)).toBe(1);
    expect(h.log.join("\n")).toContain("older JobSync release");
    expect(h.targetRows).toHaveLength(0);
    expect(h.files["/data/dev.db.imported-at"]).toBeUndefined();
  });

  it("writes no sentinel when the copy fails", async () => {
    const h = harness({ failCopy: true });
    expect(await runImport(h.deps)).toBe(1);
    expect(h.targetRows).toHaveLength(0);
    expect(h.files["/data/dev.db.imported-at"]).toBeUndefined();
    const text = h.log.join("\n");
    expect(text).toContain("Import failed while copying User");
    expect(text).toContain("Postgres was left empty and dev.db was not modified.");
  });

  it("dry run rolls back and exits 2", async () => {
    const h = harness({ env: { IMPORT_DRY_RUN: "1" } });
    expect(await runImport(h.deps)).toBe(2);
    expect(h.targetRows).toHaveLength(0);
    expect(h.committed()).toBe(false);
    expect(h.files["/data/dev.db.imported-at"]).toBeUndefined();
    const text = h.log.join("\n");
    expect(text).toContain("User: 2 → 2 ✓");
    expect(text).toContain("Dry run complete — nothing was written.");
  });

  it("reports an unwritable sentinel", async () => {
    const h = harness({ failWrite: true });
    expect(await runImport(h.deps)).toBe(1);
    expect(h.targetRows).toHaveLength(2);
    const text = h.log.join("\n");
    expect(text).toContain("The import succeeded, but its record could not be written");
    expect(text).toContain("jobsyncdb/data/dev.db.imported-at");
  });
});
