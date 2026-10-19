import { copyAll, type CopyClient, type CopyResult } from "./copy";
import { checkLegacySchema, decideImport, hostPath, sentinelPath } from "./decide";
import { buildImportPlan, type DmmfModel } from "./order";

export interface ImportDeps {
  env: Record<string, string | undefined>;
  fileExists(path: string): boolean;
  readText(path: string): string;
  writeText(path: string, text: string): void;
  openSource(url: string): CopyClient;
  target: CopyClient;
  models: readonly DmmfModel[];
  log(line: string): void;
  now(): Date;
}

const DEFAULT_LEGACY_PATH = "/data/dev.db";
// One transaction holds the whole copy, well past Prisma's 5s default
const TRANSACTION_OPTIONS = { timeout: 300_000, maxWait: 300_000 };

class DryRunRollback extends Error {
  constructor(readonly result: CopyResult) {
    super("dry run");
  }
}

const reason = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

function report(result: CopyResult, log: (line: string) => void) {
  for (const table of result.tables) {
    log(`${table.name}: ${table.source} → ${table.target} ✓`);
  }
  const rows = result.tables.reduce((sum, t) => sum + t.target, 0);
  log(
    `Import complete: ${rows} rows across ${result.tables.length} tables, ${result.sanitized} values sanitised.`,
  );
}

async function countLegacyUsers(deps: ImportDeps, legacyPath: string) {
  const source = deps.openSource(`file:${legacyPath}`);
  try {
    return await source.user.count();
  } finally {
    await source.$disconnect?.();
  }
}

// Returns the process exit code: 0 continue to boot, 1 stop, 2 dry run done
export async function runImport(deps: ImportDeps): Promise<number> {
  const { env, log } = deps;
  const legacyPath = env.SQLITE_LEGACY_PATH || DEFAULT_LEGACY_PATH;
  const sentinel = sentinelPath(legacyPath);
  const legacyFileExists = deps.fileExists(legacyPath);
  const sentinelExists = legacyFileExists && deps.fileExists(sentinel);
  const postgresHasUsers = legacyFileExists
    ? (await deps.target.user.count()) > 0
    : false;
  // Only the lost-volume case reads dev.db before deciding
  const legacyHasUsers =
    sentinelExists && !postgresHasUsers
      ? (await countLegacyUsers(deps, legacyPath)) > 0
      : true;

  const decision = decideImport({
    legacyPath,
    legacyFileExists,
    skipImport: env.SKIP_IMPORT === "1",
    postgresHasUsers,
    legacyHasUsers,
    sentinelExists,
    sentinelText: sentinelExists ? deps.readText(sentinel) : "",
  });

  if (decision.action !== "import") {
    log(decision.message);
    return decision.action === "skip" ? 0 : 1;
  }

  const source = deps.openSource(`file:${legacyPath}`);
  try {
    const applied: { migration_name: string }[] = await source.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
    );
    const refusal = checkLegacySchema(applied.map((row) => row.migration_name));
    if (refusal) {
      log(refusal);
      return 1;
    }

    const dryRun = env.IMPORT_DRY_RUN === "1";
    const plan = buildImportPlan(deps.models);
    log(`Importing ${legacyPath} into Postgres${dryRun ? " (dry run)" : ""}…`);

    let result: CopyResult;
    try {
      result = await deps.target.$transaction(async (tx: CopyClient) => {
        const copied = await copyAll(source, tx, plan, log);
        if (dryRun) throw new DryRunRollback(copied);
        return copied;
      }, TRANSACTION_OPTIONS);
    } catch (error) {
      if (error instanceof DryRunRollback) {
        report(error.result, log);
        log("Dry run complete — nothing was written. Remove IMPORT_DRY_RUN from .env and restart to import for real.");
        return 2;
      }
      log(reason(error));
      log("Postgres was left empty and dev.db was not modified. Fix the cause and restart to retry, or set SKIP_IMPORT=1 once to start the app without importing.");
      return 1;
    }

    report(result, log);

    try {
      deps.writeText(sentinel, `${deps.now().toISOString()}\n`);
    } catch (error) {
      log(`The import succeeded, but its record could not be written (${reason(error)}).`);
      log(`Create an empty file named ${hostPath(sentinel)} and restart. Without it the next start cannot tell that dev.db was already imported.`);
      return 1;
    }
    return 0;
  } finally {
    await source.$disconnect?.();
  }
}
