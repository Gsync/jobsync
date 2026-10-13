// The whole import decision is two facts: is Postgres empty, and was this
// dev.db already imported. No mtime comparison (spec section 4).

// Newest directory in prisma/migrations-sqlite-legacy; a spec pins it there
export const LAST_SQLITE_MIGRATION = "20261002141429_company_notes_size_linkedin";
// The image tag of the last release that still ran on SQLite
const LAST_SQLITE_IMAGE = "ghcr.io/gsync/jobsync:1.1.22";

export interface ImportFacts {
  legacyPath: string;
  legacyFileExists: boolean;
  skipImport: boolean;
  postgresHasUsers: boolean;
  sentinelExists: boolean;
  sentinelText: string;
}

export type ImportDecision =
  | { action: "import" }
  | { action: "skip"; message: string }
  | { action: "stop"; message: string };

export const sentinelPath = (legacyPath: string) => `${legacyPath}.imported-at`;

// Operators see the bind mount, not the container path
const hostPath = (containerPath: string) =>
  containerPath.startsWith("/data/")
    ? `jobsyncdb/data/${containerPath.slice("/data/".length)}`
    : containerPath;

const importedOn = (sentinelText: string) => {
  const text = sentinelText.trim();
  if (!text || Number.isNaN(Date.parse(text))) return "an earlier date";
  return new Date(text).toISOString().slice(0, 16).replace("T", " ");
};

const NOTHING_MODIFIED = "Nothing has been modified. Exiting.";

export function decideImport(facts: ImportFacts): ImportDecision {
  const { legacyPath } = facts;
  const sentinel = hostPath(sentinelPath(legacyPath));

  if (!facts.legacyFileExists) {
    return {
      action: "skip",
      message: `No legacy SQLite database found at ${legacyPath}, skipping import.`,
    };
  }

  if (facts.skipImport) {
    const lines = ["SKIP_IMPORT=1 is set, so the SQLite import was NOT attempted."];
    if (!facts.postgresHasUsers) {
      lines.push(
        `Postgres is empty and ${legacyPath} exists — your existing data`,
        "has not been migrated and the app is starting with no data.",
      );
    }
    lines.push("", "Remove SKIP_IMPORT from .env and restart once the cause is fixed.");
    return { action: "skip", message: lines.join("\n") };
  }

  if (facts.postgresHasUsers && facts.sentinelExists) {
    return { action: "skip", message: "SQLite data was already imported, skipping import." };
  }

  if (!facts.postgresHasUsers && facts.sentinelExists) {
    return {
      action: "stop",
      message: [
        `Postgres is empty, but dev.db was already imported on ${importedOn(facts.sentinelText)}.`,
        "The database it was imported into appears to be missing.",
        "",
        "To restore a backup:   ./restore-db.sh <file>",
        "                       (dumps are in jobsyncdb/data/backups/)",
        "To re-import the old SQLite data as it was on that date:",
        `                       delete ${sentinel}, restart.`,
        "",
        NOTHING_MODIFIED,
      ].join("\n"),
    };
  }

  if (facts.postgresHasUsers) {
    return {
      action: "stop",
      message: [
        "Postgres already contains data, but dev.db has no import record —",
        "its contents were never confirmed imported.",
        "",
        "To keep the Postgres data:  create an empty file named",
        `                            ${sentinel}, restart.`,
        "To use the SQLite data:     empty the Postgres database, restart. For the",
        "                            bundled database: docker compose down, then",
        "                            docker volume rm jobsync_pgdata.",
        "",
        NOTHING_MODIFIED,
      ].join("\n"),
    };
  }

  return { action: "import" };
}

// The snapshot client describes the last SQLite schema only, so a dev.db
// from an older release would fail mid-copy with an opaque column error.
export function checkLegacySchema(appliedMigrations: readonly string[]): string | null {
  if (appliedMigrations.includes(LAST_SQLITE_MIGRATION)) return null;
  return [
    "This dev.db comes from an older JobSync release and cannot be imported directly.",
    `It is missing the migration ${LAST_SQLITE_MIGRATION}.`,
    "",
    "Bring it up to date by starting the last SQLite release once. From the",
    "folder that holds docker-compose.yml, with JobSync stopped, run:",
    "",
    `    docker run --rm -v "$(pwd)/jobsyncdb/data:/data" -e DATABASE_URL=file:/data/dev.db ${LAST_SQLITE_IMAGE}`,
    "",
    "Wait for its server to report it is ready, press Ctrl+C, then start JobSync",
    "again. That command lets the old release migrate dev.db; this one never does.",
    "",
    NOTHING_MODIFIED,
  ].join("\n");
}
