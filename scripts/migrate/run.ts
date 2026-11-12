import { quoteIdent, redact } from "../wait/classify";
import {
  PRISMA_LOCK_KEY,
  checksum,
  planMigrations,
  schemaFromUrl,
  type MigrationFile,
  type RecordedRow,
} from "./plan";

export interface SqlClient {
  query(text: string, values?: unknown[]): Promise<{ rows: any[] }>;
}

export interface MigrateDeps {
  url: string;
  client: SqlClient;
  migrations: MigrationFile[];
  uuid(): string;
  log(line: string): void;
}

const LOCK_TIMEOUT_CODE = "55P03";

// Prisma's definition, so the real CLI keeps reading this table
const CREATE_MIGRATIONS_TABLE = `CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`;

const INSERT_ROW = `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count) VALUES ($1, $2, $3, now(), clock_timestamp(), 1)`;

const lockMessage = `Another migration holds the lock (pg_advisory_lock ${PRISMA_LOCK_KEY}) for over 10 seconds. Nothing was applied; restarting retries.`;

const unfinishedMessage = (name: string) =>
  `Migration ${name} was started but never finished or rolled back, probably by an earlier Prisma CLI run. Nothing was applied. Inspect it, mark it with \`npx -y prisma@7.10.1 migrate resolve\` from a dev machine, then restart.`;

const errorText = (error: unknown) => (error instanceof Error ? error.message : String(error));

// Waits 10 s as Prisma does; the migrations themselves are not held to it
async function takeLock(client: SqlClient): Promise<boolean> {
  await client.query("SET lock_timeout = '10s'");
  try {
    await client.query(`SELECT pg_advisory_lock(${PRISMA_LOCK_KEY})`);
  } catch (error) {
    if ((error as { code?: string }).code === LOCK_TIMEOUT_CODE) return false;
    throw error;
  }
  await client.query("RESET lock_timeout");
  return true;
}

// Looked up first: Postgres checks database-level CREATE before IF NOT EXISTS
async function selectSchema(client: SqlClient, schema: string): Promise<void> {
  const found = await client.query("SELECT 1 FROM pg_namespace WHERE nspname = $1", [schema]);
  if (found.rows.length === 0) await client.query(`CREATE SCHEMA ${quoteIdent(schema)}`);
  // Always: the role's default search_path tries "$user" before public
  await client.query(`SET search_path TO ${quoteIdent(schema)}`);
}

// No values argument: the simple protocol runs multi-statement files
async function applyOne(deps: MigrateDeps, migration: MigrationFile): Promise<boolean> {
  const { client } = deps;
  await client.query("BEGIN");
  try {
    await client.query(migration.sql);
    await client.query(INSERT_ROW, [deps.uuid(), checksum(migration.sql), migration.name]);
    await client.query("COMMIT");
  } catch (error) {
    // Logged first: a ROLLBACK on a dead connection would throw over it
    deps.log(redact(errorText(error), deps.url));
    await client.query("ROLLBACK");
    deps.log(`Migration ${migration.name} failed and was rolled back; the database is unchanged.`);
    return false;
  }
  deps.log(`Applied ${migration.name}.`);
  return true;
}

async function applyPending(deps: MigrateDeps): Promise<number> {
  const { client } = deps;
  await selectSchema(client, schemaFromUrl(deps.url) || "public");
  await client.query(CREATE_MIGRATIONS_TABLE);
  const recorded = await client.query(
    'SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations"',
  );
  const plan = planMigrations(deps.migrations, recorded.rows as RecordedRow[]);
  if (!plan.ok) {
    deps.log(unfinishedMessage(plan.unfinished));
    return 1;
  }
  for (const name of plan.missing) {
    deps.log(`Migration ${name} is recorded in the database but missing from this image; skipping it.`);
  }
  if (plan.pending.length === 0) {
    deps.log("No pending migrations.");
    return 0;
  }
  for (const migration of plan.pending) {
    if (!(await applyOne(deps, migration))) return 1;
  }
  return 0;
}

// Returns the process exit code
export async function migrateDeploy(deps: MigrateDeps): Promise<number> {
  if (!(await takeLock(deps.client))) {
    deps.log(lockMessage);
    return 1;
  }
  try {
    return await applyPending(deps);
  } finally {
    await deps.client.query(`SELECT pg_advisory_unlock(${PRISMA_LOCK_KEY})`);
  }
}
