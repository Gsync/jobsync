import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { Client } from "pg";
import { migrateDeploy } from "../../../../scripts/migrate/run";

const MIGRATIONS_DIR = path.resolve(__dirname, "../../../../prisma/migrations");

// Opt-in: CI has no database, so without this variable the spec is skipped
export function makeMigratedDbUrl(): { url: string; schema: string } | null {
  const base = process.env.BACKUP_TEST_DATABASE_URL;
  if (!base) return null;
  const schema = `migrated_test_${randomUUID().replace(/-/g, "").slice(0, 12)}`;
  const url = new URL(base);
  url.searchParams.set("schema", schema);
  return { url: url.toString(), schema };
}

function readMigrations() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => ({
      name: entry.name,
      sql: fs.readFileSync(path.join(MIGRATIONS_DIR, entry.name, "migration.sql"), "utf8"),
    }));
}

// The boot-time runner, so the test proves what a container start applies
export async function applyMigrations(url: string): Promise<void> {
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
  await client.connect();
  try {
    const code = await migrateDeploy({
      url,
      client,
      migrations: readMigrations(),
      uuid: randomUUID,
      log: () => {},
    });
    if (code !== 0) throw new Error("migrateDeploy failed on the throwaway schema");
  } finally {
    await client.end();
  }
}
