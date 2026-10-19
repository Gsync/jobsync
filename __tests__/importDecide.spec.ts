import fs from "fs";
import path from "path";
import {
  LAST_SQLITE_MIGRATION,
  checkLegacySchema,
  decideImport,
  sentinelPath,
  type ImportFacts,
} from "../scripts/import/decide";

const facts = (over: Partial<ImportFacts> = {}): ImportFacts => ({
  legacyPath: "/data/dev.db",
  legacyFileExists: true,
  skipImport: false,
  postgresHasUsers: false,
  legacyHasUsers: true,
  sentinelExists: false,
  sentinelText: "",
  ...over,
});

describe("decideImport", () => {
  it("skips a fresh install with no legacy file", () => {
    const d = decideImport(facts({ legacyFileExists: false }));
    expect(d).toEqual({
      action: "skip",
      message: "No legacy SQLite database found at /data/dev.db, skipping import.",
    });
  });

  it("imports when Postgres is empty and there is no sentinel", () => {
    expect(decideImport(facts())).toEqual({ action: "import" });
  });

  it("skips on a normal boot: data and sentinel both present", () => {
    const d = decideImport(facts({ postgresHasUsers: true, sentinelExists: true }));
    expect(d.action).toBe("skip");
  });

  it("stops when the volume was lost after an import", () => {
    const d = decideImport(
      facts({ sentinelExists: true, sentinelText: "2026-11-02T14:02:11.000Z\n" }),
    );
    expect(d.action).toBe("stop");
    const message = (d as { message: string }).message;
    expect(message).toContain("dev.db was already imported on 2026-11-02 14:02");
    expect(message).toContain("./restore-db.sh <file>");
    expect(message).toContain("delete jobsyncdb/data/dev.db.imported-at");
    expect(message).toContain("Nothing has been modified. Exiting.");
  });

  it("skips instead of stopping when the imported dev.db had no users", () => {
    const d = decideImport(facts({ sentinelExists: true, legacyHasUsers: false }));
    expect(d).toEqual({
      action: "skip",
      message: "/data/dev.db was already imported and has no users, skipping import.",
    });
  });

  it.each(["", "   \n", "not a date"])("counts sentinel text %j as present", (sentinelText) => {
    const d = decideImport(facts({ sentinelExists: true, sentinelText }));
    expect(d.action).toBe("stop");
    expect((d as { message: string }).message).toContain("already imported on an earlier date");
  });

  it("stops when Postgres has data but nothing was confirmed imported", () => {
    const d = decideImport(facts({ postgresHasUsers: true }));
    expect(d.action).toBe("stop");
    const message = (d as { message: string }).message;
    expect(message).toContain("create an empty file named");
    expect(message).toContain("jobsyncdb/data/dev.db.imported-at");
    expect(message).toContain("empty the Postgres database, restart.");
    expect(message).toContain("docker volume rm jobsync_pgdata");
    expect(message).not.toContain("SKIP_IMPORT");
  });

  it("names the stranded state when SKIP_IMPORT hides an empty database", () => {
    const d = decideImport(facts({ skipImport: true }));
    expect(d.action).toBe("skip");
    const message = (d as { message: string }).message;
    expect(message).toContain("SKIP_IMPORT=1 is set, so the SQLite import was NOT attempted.");
    expect(message).toContain("Postgres is empty and /data/dev.db exists");
    expect(message).toContain("Remove SKIP_IMPORT from .env");
  });

  it("lets SKIP_IMPORT pass both stop states, still loudly", () => {
    for (const over of [{ sentinelExists: true }, { postgresHasUsers: true }]) {
      const d = decideImport(facts({ skipImport: true, ...over }));
      expect(d.action).toBe("skip");
      expect((d as { message: string }).message).toContain("SKIP_IMPORT=1 is set");
    }
  });

  it("shows a custom legacy path as given", () => {
    const d = decideImport(
      facts({ legacyPath: "/mnt/old/app.db", sentinelExists: true }),
    );
    expect((d as { message: string }).message).toContain("delete /mnt/old/app.db.imported-at");
  });

  it("derives the sentinel beside the legacy file", () => {
    expect(sentinelPath("/data/dev.db")).toBe("/data/dev.db.imported-at");
  });
});

describe("checkLegacySchema", () => {
  it("accepts a database that has the last SQLite migration", () => {
    expect(checkLegacySchema(["20240524022540_init", LAST_SQLITE_MIGRATION])).toBeNull();
  });

  it("refuses a database from an older release", () => {
    const message = checkLegacySchema(["20240524022540_init"]);
    expect(message).toContain("older JobSync release");
    expect(message).toContain(LAST_SQLITE_MIGRATION);
    expect(message).toContain(
      'docker run --rm -v "$(pwd)/jobsyncdb/data:/data" -e DATABASE_URL=file:/data/dev.db ghcr.io/gsync/jobsync:1.1.22',
    );
    expect(message).toContain("Nothing has been modified. Exiting.");
  });

  it("names the newest migration in the retired history", () => {
    const dirs = fs
      .readdirSync(path.resolve(__dirname, "../prisma/migrations-sqlite-legacy"))
      .filter((name) => /^\d/.test(name))
      .sort();
    expect(LAST_SQLITE_MIGRATION).toBe(dirs[dirs.length - 1]);
  });
});
