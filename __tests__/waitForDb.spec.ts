import { checkUrl, classify, maintenanceUrl, quoteIdent, redact, UPGRADE_GUIDE_URL } from "../scripts/wait/classify";
import { waitForDb, type WaitDeps } from "../scripts/wait/run";

const SECRET = "s3cr@t:pa/ss#word";
const URL_OK = `postgres://jobsync:${encodeURIComponent(SECRET)}@db.example.internal:5433/jobsync`;

const failure = (errorCode?: string, message = "boom") => Object.assign(new Error(message), { errorCode });

function harness(over: {
  url?: string;
  env?: Record<string, string>;
  attempts?: (Error | null)[];
  createFails?: Error;
  dbResolves?: boolean;
} = {}) {
  const log: string[] = [];
  const attempts = [...(over.attempts ?? [null])];
  let clock = 0;
  const created: { url: string; name: string }[] = [];
  let connects = 0;
  const deps: WaitDeps = {
    env: { DATABASE_URL: "url" in over ? over.url : URL_OK, ...over.env },
    connect: async () => {
      connects++;
      const next = attempts.length > 1 ? attempts.shift() : attempts[0];
      if (next) throw next;
    },
    createDatabase: async (url, name) => {
      if (over.createFails) throw over.createFails;
      created.push({ url, name });
    },
    resolves: async () => over.dbResolves ?? true,
    sleep: async (ms) => {
      clock += ms;
    },
    now: () => clock,
    log: (line) => log.push(line),
  };
  return { deps, log, created, connects: () => connects, text: () => log.join("\n") };
}

describe("checkUrl", () => {
  it("parses host, port and database", () => {
    expect(checkUrl(URL_OK)).toEqual({
      ok: true,
      target: { host: "db.example.internal", port: "5433", database: "jobsync" },
    });
  });

  it("defaults the port and accepts postgresql://", () => {
    expect(checkUrl("postgresql://u:p@host/app")).toEqual({
      ok: true,
      target: { host: "host", port: "5432", database: "app" },
    });
  });

  it.each([undefined, "", "   "])("reports %j as not set", (raw) => {
    expect(checkUrl(raw)).toEqual({ ok: false, message: "DATABASE_URL is not set." });
  });

  it.each(["file:/data/dev.db", "file:./dev.db"])("names the SQLite url %s as found", (raw) => {
    const result = checkUrl(raw) as { ok: false; message: string };
    expect(result.ok).toBe(false);
    expect(result.message).toContain(`DATABASE_URL still points at SQLite (${raw}).`);
    expect(result.message).toContain(UPGRADE_GUIDE_URL);
    // Reached only with BUNDLED_DB=0: a plain leftover falls back to bundled
    expect(result.message).toContain("Set DATABASE_URL to your own Postgres, or remove BUNDLED_DB=0");
    expect(result.message).not.toContain("Delete the DATABASE_URL line");
    expect(result.message).toContain("Your existing database has NOT been modified.");
  });

  it.each(["not a url", "mysql://u:p@h/db", "postgres://u:p@host", "postgres://u:p@/db"])(
    "reports %s as malformed",
    (raw) => {
      const result = checkUrl(raw) as { ok: false; message: string };
      expect(result.message).toContain("DATABASE_URL is malformed.");
    },
  );
});

describe("classify", () => {
  it.each([
    ["P1000", "auth"],
    ["P1003", "missing-database"],
    ["P1012", "bad-url"],
    ["P1001", "retry"],
    ["P1002", "retry"],
    ["P1017", "retry"],
    ["P9999", "retry"],
    [undefined, "retry"],
  ])("%s -> %s", (code, verdict) => {
    expect(classify(code)).toBe(verdict);
  });
});

describe("helpers", () => {
  it("points the maintenance url at postgres, keeping credentials and params", () => {
    expect(maintenanceUrl("postgres://u:p@host:5433/app?sslmode=require")).toBe(
      "postgres://u:p@host:5433/postgres?sslmode=require",
    );
  });

  it("quotes an identifier", () => {
    expect(quoteIdent('job"sync')).toBe('"job""sync"');
  });

  it("redacts a password whose % is not a valid escape", () => {
    expect(redact("auth failed for p%zz", "postgres://u:p%zz@h/db")).toBe("auth failed for ***");
  });
});

describe("waitForDb", () => {
  it("returns 0 on a first-try connection", async () => {
    const h = harness();
    expect(await waitForDb(h.deps)).toBe(0);
    expect(h.text()).toContain("Database reachable at db.example.internal:5433/jobsync.");
  });

  it("retries a starting database and then succeeds", async () => {
    const h = harness({ attempts: [failure("P1001"), failure("P1002"), null] });
    expect(await waitForDb(h.deps)).toBe(0);
    expect(h.connects()).toBe(3);
    expect(h.text()).toContain("waiting for database at db.example.internal:5433");
  });

  it("retries an unknown error code within the window, then gives up", async () => {
    const h = harness({ attempts: [failure("P7777")] });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.connects()).toBeGreaterThan(5);
    expect(h.text()).toContain("Could not reach the database at db.example.internal:5433 within 60 seconds.");
  });

  it("exits at once on an auth failure, with the external causes", async () => {
    const h = harness({ attempts: [failure("P1000")] });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.connects()).toBe(1);
    expect(h.text()).toContain("percent-encoded");
    expect(h.text()).toContain("pg_hba.conf");
  });

  it("names password rotation for the bundled database", async () => {
    const h = harness({ url: "postgres://jobsync:jobsync@db:5432/jobsync", attempts: [failure("P1000")] });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.text()).toContain("POSTGRES_PASSWORD was changed after the database volume was created");
  });

  it("exits at once when the url is not set, is SQLite or is malformed", async () => {
    for (const url of [undefined, "file:/data/dev.db", "nonsense"]) {
      const h = harness({ url });
      expect(await waitForDb(h.deps)).toBe(1);
      expect(h.connects()).toBe(0);
    }
  });

  it("creates a missing database, says so, and continues", async () => {
    const h = harness({ attempts: [failure("P1003"), null] });
    expect(await waitForDb(h.deps)).toBe(0);
    expect(h.created).toEqual([
      { url: `postgres://jobsync:${encodeURIComponent(SECRET)}@db.example.internal:5433/postgres`, name: '"jobsync"' },
    ]);
    expect(h.text()).toContain('Database "jobsync" did not exist on db.example.internal:5433 — created it.');
    expect(h.text()).toContain("a typo in the database");
  });

  it("falls back to the manual SQL when creation is refused", async () => {
    const h = harness({
      attempts: [failure("P1003")],
      createFails: new Error("permission denied to create database"),
    });
    expect(await waitForDb(h.deps)).toBe(1);
    const text = h.text();
    expect(text).toContain("could not create it: permission denied to create database");
    expect(text).toContain("CREATE DATABASE jobsync OWNER <role>;");
    expect(text).toContain("GRANT ALL ON SCHEMA public TO <role>;");
  });

  it("does not create when CREATE_DATABASE_IF_MISSING=0", async () => {
    const h = harness({ attempts: [failure("P1003")], env: { CREATE_DATABASE_IF_MISSING: "0" } });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.created).toEqual([]);
    expect(h.text()).toContain("CREATE DATABASE jobsync OWNER <role>;");
  });

  it("does not loop when the database is still missing after creating it", async () => {
    const h = harness({ attempts: [failure("P1003")] });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.created).toHaveLength(1);
  });

  it("explains an unresolvable bundled host", async () => {
    const h = harness({
      url: "postgres://jobsync:jobsync@db:5432/jobsync",
      attempts: [failure("P1001")],
      dbResolves: false,
    });
    expect(await waitForDb(h.deps)).toBe(1);
    expect(h.text()).toContain('DATABASE_URL points at host "db", but no such host exists');
    expect(h.text()).toContain("BUNDLED_DB=0");
  });

  it("never logs the password", async () => {
    const cases = [
      { attempts: [failure("P1000")] },
      { attempts: [failure("P1012")] },
      { attempts: [failure("P1001", `Can't reach ${URL_OK}`)] },
      { attempts: [failure("P1003")], createFails: new Error(`denied for ${URL_OK}`) },
      { attempts: [failure("P1003"), null] },
      { url: `postgres://jobsync:${SECRET}@host/db`, attempts: [failure("P1000")] },
    ];
    for (const c of cases) {
      const h = harness(c);
      await waitForDb(h.deps);
      expect(h.text()).not.toContain(SECRET);
      expect(h.text()).not.toContain(encodeURIComponent(SECRET));
    }
  });
});
