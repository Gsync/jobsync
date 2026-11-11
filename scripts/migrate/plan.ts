import { createHash } from "node:crypto";

export interface MigrationFile {
  name: string;
  sql: string;
}

export interface RecordedRow {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
}

export type MigrationPlan =
  | { ok: true; pending: MigrationFile[]; missing: string[] }
  | { ok: false; unfinished: string };

// Prisma's own key, so this script and a real CLI never migrate at once
export const PRISMA_LOCK_KEY = 72707369;

export const checksum = (sql: string) => createHash("sha256").update(sql).digest("hex");

export const schemaFromUrl = (raw: string) => new URL(raw).searchParams.get("schema");

// Decides by name only: checksums are written, never compared
export function planMigrations(files: MigrationFile[], rows: RecordedRow[]): MigrationPlan {
  const unfinished = rows.find((row) => !row.finished_at && !row.rolled_back_at);
  if (unfinished) return { ok: false, unfinished: unfinished.migration_name };

  const finished = new Set(rows.filter((row) => row.finished_at).map((row) => row.migration_name));
  const names = new Set(files.map((file) => file.name));
  const pending = files
    .filter((file) => !finished.has(file.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  const missing = [...finished].filter((name) => !names.has(name));
  return { ok: true, pending, missing };
}
