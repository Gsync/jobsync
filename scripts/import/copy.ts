import { delegateName, type ImportPlan } from "./order";
import { sanitizeRow } from "./sanitize";

// Postgres caps one statement at 32767 bind parameters; Job has ~35 columns,
// so 500 rows stays well under it. Do not raise this to 1000.
export const IMPORT_BATCH_SIZE = 500;

// Structural on purpose: the real argument is a Prisma client or transaction
// client, and this module must not import either generated client.
export type CopyClient = Record<string, any>;

export interface CopyResult {
  tables: { name: string; source: number; target: number }[];
  sanitized: number;
}

type Row = Record<string, unknown> & { id: string };

const reason = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const joinCount = async (client: CopyClient, table: string) => {
  const rows = await client.$queryRawUnsafe(`SELECT COUNT(*) AS n FROM "${table}"`);
  return Number(rows[0].n);
};

export async function copyAll(
  source: CopyClient,
  target: CopyClient,
  plan: ImportPlan,
  log: (line: string) => void,
  batchSize: number = IMPORT_BATCH_SIZE,
): Promise<CopyResult> {
  let sanitized = 0;
  const pending: { model: string; id: string; field: string; value: unknown }[] = [];

  for (const model of plan.order) {
    const key = delegateName(model);
    const deferred = plan.deferred.filter((d) => d.model === model).map((d) => d.field);
    let cursor: string | undefined;

    for (;;) {
      const rows: Row[] = await source[key].findMany({
        take: batchSize,
        orderBy: { id: "asc" },
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (rows.length === 0) break;
      cursor = rows[rows.length - 1].id;

      const data = rows.map((row) => {
        const clean = sanitizeRow(row, (column) => {
          sanitized++;
          log(`Sanitised ${model}.${column} on row ${row.id} (removed characters Postgres cannot store)`);
        });
        if (deferred.length === 0) return clean;
        const copy: Row = { ...clean };
        for (const field of deferred) {
          if (copy[field] !== null && copy[field] !== undefined) pending.push({ model, id: row.id, field, value: copy[field] });
          copy[field] = null;
        }
        return copy;
      });

      try {
        await target[key].createMany({ data, skipDuplicates: true });
      } catch (error) {
        throw new Error(`Import failed while copying ${model}: ${reason(error)}`);
      }
      if (rows.length < batchSize) break;
    }
  }

  for (const edge of pending) {
    await target[delegateName(edge.model)].update({
      where: { id: edge.id },
      data: { [edge.field]: edge.value },
    });
  }

  // Implicit many-to-many tables have no delegate, so they go through raw SQL
  // and must carry ON CONFLICT themselves to stay re-runnable.
  for (const join of plan.joinTables) {
    const pairs: { A: string; B: string }[] = await source.$queryRawUnsafe(
      `SELECT "A", "B" FROM "${join.table}"`,
    );
    for (let i = 0; i < pairs.length; i += batchSize) {
      const chunk = pairs.slice(i, i + batchSize);
      const values = chunk.map((_, n) => `($${n * 2 + 1}, $${n * 2 + 2})`).join(", ");
      try {
        await target.$executeRawUnsafe(
          `INSERT INTO "${join.table}" ("A", "B") VALUES ${values} ON CONFLICT DO NOTHING`,
          ...chunk.flatMap((pair) => [pair.A, pair.B]),
        );
      } catch (error) {
        throw new Error(`Import failed while copying ${join.table}: ${reason(error)}`);
      }
    }
  }

  // ON CONFLICT can only hide a conflict, so the counts are what make it safe
  const tables: CopyResult["tables"] = [];
  for (const model of plan.order) {
    const key = delegateName(model);
    tables.push({
      name: model,
      source: await source[key].count(),
      target: await target[key].count(),
    });
  }
  for (const join of plan.joinTables) {
    tables.push({
      name: join.table,
      source: await joinCount(source, join.table),
      target: await joinCount(target, join.table),
    });
  }

  const wrong = tables.filter((t) => t.source !== t.target);
  if (wrong.length > 0) {
    const detail = wrong
      .map((t) => `${t.name} (${t.source} in SQLite, ${t.target} in Postgres)`)
      .join(", ");
    throw new Error(`Row counts differ after the copy: ${detail}`);
  }

  return { tables, sanitized };
}
