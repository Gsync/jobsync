import { randomUUID } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";
import { redact } from "./wait/classify";
import type { MigrationFile } from "./migrate/plan";
import { migrateDeploy } from "./migrate/run";

// Compiled to /app/scripts/dist/, beside /app/prisma
const MIGRATIONS_DIR = path.resolve(__dirname, "../../prisma/migrations");

function readMigrations(): MigrationFile[] {
  return readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(MIGRATIONS_DIR, entry.name, "migration.sql"))
    .filter((file) => existsSync(file))
    .map((file) => ({ name: path.basename(path.dirname(file)), sql: readFileSync(file, "utf8") }));
}

async function main(url: string): Promise<number> {
  const migrations = readMigrations();
  const client = new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });
  try {
    await client.connect();
    return await migrateDeploy({ url, client, migrations, uuid: randomUUID, log: console.log });
  } finally {
    await client.end().catch((error: Error) => {
      console.error(`Closing the database connection failed: ${redact(error.message, url)}`);
    });
  }
}

const url = process.env.DATABASE_URL ?? "";
main(url).then(
  (code) => process.exit(code),
  (error) => {
    console.error(redact(error instanceof Error ? error.message : String(error), url));
    process.exit(1);
  },
);
