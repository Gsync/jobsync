// @vitest-environment node
import { checksum, planMigrations, schemaFromUrl, type MigrationFile, type RecordedRow } from "../scripts/migrate/plan";
import { migrateDeploy } from "../scripts/migrate/run";

const INIT: MigrationFile = { name: "00000000000000_init_postgres", sql: "CREATE TABLE a (id int);\nCREATE TABLE b (id int);" };
const NEXT: MigrationFile = { name: "20261201000000_next", sql: "ALTER TABLE a ADD c int;" };
const URL = "postgres://jobsync:hunter2@db:5432/jobsync";
const done = (name: string): RecordedRow => ({ migration_name: name, finished_at: new Date(), rolled_back_at: null });

interface FakeOptions {
  rows?: RecordedRow[];
  schemas?: string[];
  failOn?: string;
  lockTimeout?: boolean;
}

function fakeClient({ rows = [], schemas = ["public"], failOn, lockTimeout }: FakeOptions = {}) {
  const calls: { text: string; values?: unknown[] }[] = [];
  const client = {
    calls,
    async query(text: string, values?: unknown[]) {
      calls.push({ text, values });
      if (lockTimeout && text.includes("pg_advisory_lock(")) {
        throw Object.assign(new Error("canceling statement due to lock timeout"), { code: "55P03" });
      }
      if (failOn && text.includes(failOn)) {
        throw new Error(`syntax error at BROKEN in postgres://jobsync:hunter2@db/jobsync`);
      }
      if (text.startsWith("SELECT migration_name")) return { rows };
      if (text.includes("pg_namespace")) {
        return { rows: schemas.includes(values?.[0] as string) ? [{ "?column?": 1 }] : [] };
      }
      return { rows: [] };
    },
  };
  return client;
}

async function run(opts: FakeOptions & { url?: string; migrations?: MigrationFile[] } = {}) {
  const client = fakeClient(opts);
  let n = 0;
  const log: string[] = [];
  const code = await migrateDeploy({
    url: opts.url ?? URL,
    client,
    migrations: opts.migrations ?? [INIT],
    uuid: () => `uuid-${++n}`,
    log: (line) => log.push(line),
  });
  const texts = client.calls.map((c) => c.text);
  return { code, log, calls: client.calls, texts };
}

const has = (texts: string[], fragment: string) => texts.some((t) => t.includes(fragment));

describe("checksum", () => {
  it("is the SHA-256 hex of the file", () => {
    expect(checksum("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("schemaFromUrl", () => {
  it("reads ?schema=", () => {
    expect(schemaFromUrl("postgres://u:p@h:5432/db?schema=my-schema")).toBe("my-schema");
  });

  it("is null without ?schema=", () => {
    expect(schemaFromUrl("postgres://u:p@h:5432/db")).toBeNull();
  });
});

describe("planMigrations", () => {
  it("returns pending files sorted by name", () => {
    const plan = planMigrations([NEXT, INIT], []);
    expect(plan).toEqual({ ok: true, pending: [INIT, NEXT], missing: [] });
  });

  it("counts a row with only rolled_back_at as pending", () => {
    const rolledBack = { migration_name: INIT.name, finished_at: null, rolled_back_at: new Date() };
    expect(planMigrations([INIT], [rolledBack])).toEqual({ ok: true, pending: [INIT], missing: [] });
  });

  it("lists a finished row with no file as missing", () => {
    expect(planMigrations([INIT], [done(INIT.name), done("29990101000000_future")])).toEqual({
      ok: true,
      pending: [],
      missing: ["29990101000000_future"],
    });
  });

  it("refuses an unfinished row", () => {
    const unfinished = { migration_name: INIT.name, finished_at: null, rolled_back_at: null };
    expect(planMigrations([INIT], [unfinished])).toEqual({ ok: false, unfinished: INIT.name });
  });
});

describe("migrateDeploy", () => {
  it("applies and records the init migration on a fresh install", async () => {
    const { code, log, calls, texts } = await run();
    expect(code).toBe(0);
    expect(texts).toEqual([
      "SET lock_timeout = '10s'",
      "SELECT pg_advisory_lock(72707369)",
      "RESET lock_timeout",
      expect.stringContaining("pg_namespace"),
      'SET search_path TO "public"',
      expect.stringContaining('CREATE TABLE IF NOT EXISTS "_prisma_migrations"'),
      expect.stringContaining("SELECT migration_name, finished_at, rolled_back_at"),
      "BEGIN",
      INIT.sql,
      expect.stringContaining('INSERT INTO "_prisma_migrations"'),
      "COMMIT",
      "SELECT pg_advisory_unlock(72707369)",
    ]);
    const insert = calls.find((c) => c.text.startsWith('INSERT INTO "_prisma_migrations"'));
    expect(insert?.values).toEqual(["uuid-1", checksum(INIT.sql), INIT.name]);
    expect(calls.find((c) => c.text === INIT.sql)?.values).toBeUndefined();
    expect(log).toEqual(["Applied 00000000000000_init_postgres."]);
  });

  it("creates the bookkeeping table with Prisma's eight columns", async () => {
    const { texts } = await run();
    const create = texts.find((t) => t.includes('CREATE TABLE IF NOT EXISTS "_prisma_migrations"'));
    for (const column of [
      '"id" VARCHAR(36) PRIMARY KEY NOT NULL',
      '"checksum" VARCHAR(64) NOT NULL',
      '"finished_at" TIMESTAMPTZ',
      '"migration_name" VARCHAR(255) NOT NULL',
      '"logs" TEXT',
      '"rolled_back_at" TIMESTAMPTZ',
      '"started_at" TIMESTAMPTZ NOT NULL DEFAULT now()',
      '"applied_steps_count" INTEGER NOT NULL DEFAULT 0',
    ]) {
      expect(create).toContain(column);
    }
  });

  it("is a no-op on a 1.2.0 database", async () => {
    const { code, log, texts } = await run({ rows: [done(INIT.name)] });
    expect(code).toBe(0);
    expect(texts).not.toContain("BEGIN");
    expect(log).toEqual(["No pending migrations."]);
  });

  it("applies only the new migration", async () => {
    const { code, log, texts } = await run({ migrations: [NEXT, INIT], rows: [done(INIT.name)] });
    expect(code).toBe(0);
    expect(texts).toContain(NEXT.sql);
    expect(texts).not.toContain(INIT.sql);
    expect(log).toEqual(["Applied 20261201000000_next."]);
  });

  it("rolls back a failing migration and stops", async () => {
    const broken = { ...INIT, sql: "CREATE TABLE a (id int) BROKEN;" };
    const { code, log, texts } = await run({ migrations: [broken, NEXT], failOn: "BROKEN" });
    expect(code).toBe(1);
    expect(texts).toContain("ROLLBACK");
    expect(texts).toContain("SELECT pg_advisory_unlock(72707369)");
    expect(has(texts, 'INSERT INTO "_prisma_migrations"')).toBe(false);
    expect(texts).not.toContain("COMMIT");
    expect(texts).not.toContain(NEXT.sql);
    const joined = log.join("\n");
    expect(joined).toContain(INIT.name);
    expect(joined).toContain("syntax error at BROKEN");
    expect(joined).not.toContain("hunter2");
  });

  it("stops on a half-finished row", async () => {
    const rows = [{ migration_name: INIT.name, finished_at: null, rolled_back_at: null }];
    const { code, log, texts } = await run({ rows });
    expect(code).toBe(1);
    expect(texts).not.toContain("BEGIN");
    expect(texts).toContain("SELECT pg_advisory_unlock(72707369)");
    const joined = log.join("\n");
    expect(joined).toContain(INIT.name);
    expect(joined).toContain("migrate resolve");
  });

  it("logs a recorded migration with no folder and continues", async () => {
    const { code, log } = await run({ rows: [done(INIT.name), done("29990101000000_future")] });
    expect(code).toBe(0);
    expect(log).toEqual([
      "Migration 29990101000000_future is recorded in the database but missing from this image; skipping it.",
      "No pending migrations.",
    ]);
  });

  it("gives up after the lock timeout", async () => {
    const { code, log, texts } = await run({ lockTimeout: true });
    expect(code).toBe(1);
    expect(has(texts, "pg_namespace")).toBe(false);
    expect(has(texts, "CREATE TABLE")).toBe(false);
    expect(texts).not.toContain("BEGIN");
    expect(has(texts, "pg_advisory_unlock")).toBe(false);
    expect(log).toEqual([
      "Another migration holds the lock (pg_advisory_lock 72707369) for over 10 seconds. Nothing was applied; restarting retries.",
    ]);
  });

  it("creates a missing ?schema= schema after taking the lock", async () => {
    const { calls } = await run({ url: `${URL}?schema=my-schema` });
    const after = calls.slice(calls.findIndex((c) => c.text === "RESET lock_timeout") + 1);
    expect(after[0]).toEqual({ text: expect.stringContaining("pg_namespace"), values: ["my-schema"] });
    expect(after[1].text).toBe('CREATE SCHEMA "my-schema"');
    expect(after[2].text).toBe('SET search_path TO "my-schema"');
  });

  it("does not re-create an existing ?schema= schema", async () => {
    const { calls, texts } = await run({ url: `${URL}?schema=public` });
    const after = calls.slice(calls.findIndex((c) => c.text === "RESET lock_timeout") + 1);
    expect(after[0].values).toEqual(["public"]);
    expect(has(texts, "CREATE SCHEMA")).toBe(false);
    expect(after[1].text).toBe('SET search_path TO "public"');
  });

  it("selects public without ?schema=", async () => {
    const { calls, texts } = await run();
    const after = calls.slice(calls.findIndex((c) => c.text === "RESET lock_timeout") + 1);
    expect(after[0].values).toEqual(["public"]);
    expect(has(texts, "CREATE SCHEMA")).toBe(false);
    expect(after[1].text).toBe('SET search_path TO "public"');
  });
});
