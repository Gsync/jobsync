// toWikiPageName capitalises every word of the file name, "To" included
export const UPGRADE_GUIDE_URL = "https://github.com/Gsync/jobsync/wiki/Upgrading-To-Postgres";

export interface Target {
  host: string;
  port: string;
  database: string;
}

export type UrlCheck = { ok: true; target: Target } | { ok: false; message: string };

const MALFORMED =
  "DATABASE_URL is malformed. Expected postgres://user:password@host:5432/database — a password containing @ : / or # must be percent-encoded.";

export function checkUrl(raw: string | undefined): UrlCheck {
  if (!raw || raw.trim() === "") return { ok: false, message: "DATABASE_URL is not set." };

  // Checked before Prisma sees it: P1012 covers this and every other bad
  // string. Reached only with BUNDLED_DB=0 or an older compose file.
  if (raw.startsWith("file:")) {
    return {
      ok: false,
      message: [
        `DATABASE_URL still points at SQLite (${raw}).`,
        `This release requires Postgres — see ${UPGRADE_GUIDE_URL}.`,
        "Set DATABASE_URL to your own Postgres, or remove BUNDLED_DB=0",
        "to use the bundled database.",
        "Your existing database has NOT been modified.",
      ].join("\n"),
    };
  }

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, message: MALFORMED };
  }
  const database = decodeURIComponent(url.pathname.replace(/^\//, ""));
  if (!/^postgres(ql)?:$/.test(url.protocol) || !url.hostname || !database) {
    return { ok: false, message: MALFORMED };
  }
  return { ok: true, target: { host: url.hostname, port: url.port || "5432", database } };
}

export type Verdict = "retry" | "auth" | "missing-database" | "bad-url";

// Anything unlisted retries: the window is bounded, so an unknown code still
// ends in a non-zero exit, only with a coherent log.
export function classify(errorCode: string | undefined): Verdict {
  switch (errorCode) {
    case "P1000":
      return "auth";
    case "P1003":
      return "missing-database";
    case "P1012":
      return "bad-url";
    default:
      return "retry";
  }
}

export function maintenanceUrl(raw: string): string {
  const url = new URL(raw);
  url.pathname = "/postgres";
  return url.toString();
}

export const quoteIdent = (name: string) => `"${name.replace(/"/g, '""')}"`;

// Driver messages can echo the connection string. Only the :password@ form
// is masked, since the default password "jobsync" is also the user and db name
export function redact(message: string, raw: string): string {
  let password = "";
  try {
    password = new URL(raw).password;
  } catch {
    return message;
  }
  if (!password) return message;
  const masked = message.split(`:${password}@`).join(":***@");
  // A stray % (p%zz) is a valid URL but not a valid escape
  try {
    return masked.split(`:${decodeURIComponent(password)}@`).join(":***@");
  } catch {
    return masked;
  }
}

export const MALFORMED_MESSAGE = MALFORMED;

export function authMessage(target: Target): string {
  const head = `Authentication failed for the database at ${target.host}:${target.port}.`;
  if (target.host === "db") {
    return [
      head,
      "",
      "The most likely cause is that POSTGRES_PASSWORD was changed after the database volume was created.",
      "That variable only applies the first time the volume is initialised. Either change it back, or run",
      "ALTER USER jobsync PASSWORD '<new>' inside the jobsync_db container.",
    ].join("\n");
  }
  return [
    head,
    "",
    "Check DATABASE_URL: a password containing @ : / or # must be percent-encoded.",
    "On a self-managed server, also check pg_hba.conf has an entry for this host's address.",
  ].join("\n");
}

export function createdMessage(target: Target): string {
  return [
    `Database "${target.database}" did not exist on ${target.host}:${target.port} — created it.`,
    "If that name looks wrong, check DATABASE_URL: a typo in the database",
    "name will silently produce a new, empty database rather than an error.",
  ].join("\n");
}

export function missingDatabaseMessage(target: Target, why: string | null): string {
  const head = why
    ? [`Database "${target.database}" does not exist on ${target.host}:${target.port}, and JobSync`, `could not create it: ${why}`]
    : [`Database "${target.database}" does not exist on ${target.host}:${target.port}.`];
  return [
    ...head,
    "",
    "Create it manually with:",
    `    CREATE DATABASE ${target.database} OWNER <role>;`,
    "",
    "On Postgres 15+, if the role does not own the database, also:",
    "    GRANT ALL ON SCHEMA public TO <role>;",
  ].join("\n");
}

export const BUNDLED_HOST_MESSAGE = [
  'DATABASE_URL points at host "db", but no such host exists on the',
  "Docker network — the bundled database container is not running.",
  "",
  "If BUNDLED_DB=0 is set in your .env, either remove it (to use the",
  "bundled database) or set DATABASE_URL to your own Postgres.",
].join("\n");
