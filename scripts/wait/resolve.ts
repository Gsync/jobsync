export interface Resolved {
  url: string;
  warning: string | null;
}

// A file: url can never be valid on Postgres, so a leftover one means "unset"
export function resolveDatabaseUrl(env: Record<string, string | undefined>): Resolved {
  const raw = env.DATABASE_URL ?? "";
  const bundled = env.BUNDLED_DATABASE_URL;
  // An older compose file passes no bundled address: leave it to checkUrl
  if (!bundled) return { url: raw, warning: null };
  if (raw.trim() === "") return { url: bundled, warning: null };
  if (raw.startsWith("file:") && env.BUNDLED_DB !== "0") {
    return {
      url: bundled,
      warning: [
        `Ignoring DATABASE_URL=${raw} — SQLite is no longer supported.`,
        "Using the bundled Postgres database. You can delete that line from .env.",
      ].join("\n"),
    };
  }
  return { url: raw, warning: null };
}
