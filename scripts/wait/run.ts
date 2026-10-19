import {
  BUNDLED_HOST_MESSAGE,
  MALFORMED_MESSAGE,
  authMessage,
  checkUrl,
  classify,
  createdMessage,
  maintenanceUrl,
  missingDatabaseMessage,
  quoteIdent,
  redact,
} from "./classify";

export interface WaitDeps {
  env: Record<string, string | undefined>;
  // Must reject with the driver error untouched: errorCode is only present
  // when the failure came from $connect(), never from a lazy first query.
  connect(url: string): Promise<void>;
  createDatabase(maintenanceUrl: string, quotedName: string): Promise<void>;
  resolves(host: string): Promise<boolean>;
  sleep(ms: number): Promise<void>;
  now(): number;
  log(line: string): void;
}

const WAIT_WINDOW_MS = 60_000;
const MAX_BACKOFF_MS = 5_000;

const reason = (error: unknown, raw: string) =>
  redact(error instanceof Error ? error.message : String(error), raw);

// Returns the process exit code
export async function waitForDb(deps: WaitDeps): Promise<number> {
  const raw = deps.env.DATABASE_URL;
  const checked = checkUrl(raw);
  if (!checked.ok) {
    deps.log(checked.message);
    return 1;
  }
  const url = raw as string;
  const { target } = checked;
  const where = `${target.host}:${target.port}`;
  const deadline = deps.now() + WAIT_WINDOW_MS;
  let attempt = 0;
  let created = false;

  for (;;) {
    try {
      await deps.connect(url);
      deps.log(`Database reachable at ${where}/${target.database}.`);
      return 0;
    } catch (error) {
      const verdict = classify((error as { errorCode?: string }).errorCode);

      if (verdict === "auth") {
        deps.log(authMessage(target));
        return 1;
      }
      if (verdict === "bad-url") {
        deps.log(MALFORMED_MESSAGE);
        return 1;
      }
      if (verdict === "missing-database") {
        if (created || deps.env.CREATE_DATABASE_IF_MISSING === "0") {
          deps.log(missingDatabaseMessage(target, null));
          return 1;
        }
        try {
          await deps.createDatabase(maintenanceUrl(url), quoteIdent(target.database));
        } catch (createError) {
          deps.log(missingDatabaseMessage(target, reason(createError, url)));
          return 1;
        }
        created = true;
        deps.log(createdMessage(target));
        continue;
      }

      if (deps.now() >= deadline) {
        if (target.host === "db" && !(await deps.resolves("db"))) {
          deps.log(BUNDLED_HOST_MESSAGE);
        } else {
          deps.log(`Could not reach the database at ${where} within 60 seconds. Last error: ${reason(error, url)}`);
        }
        return 1;
      }
      attempt++;
      deps.log(`waiting for database at ${where}… (attempt ${attempt})`);
      await deps.sleep(Math.min(attempt * 1000, MAX_BACKOFF_MS));
    }
  }
}
