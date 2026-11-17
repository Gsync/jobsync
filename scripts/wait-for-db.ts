import { lookup } from "node:dns/promises";
import { Client } from "pg";
import { waitForDb } from "./wait/run";

// Built inside the async callers, so a URL parse error becomes a rejection
const client = (url: string) => new Client({ connectionString: url, connectionTimeoutMillis: 5_000 });

waitForDb({
  env: process.env,
  connect: async (url) => {
    const pg = client(url);
    try {
      await pg.connect();
    } finally {
      // Ignored: after a failed attempt it can reject, and retries would spam it
      await pg.end().catch(() => {});
    }
  },
  // One standalone statement: CREATE DATABASE cannot run in a transaction
  createDatabase: async (url, quotedName) => {
    const pg = client(url);
    try {
      await pg.connect();
      await pg.query(`CREATE DATABASE ${quotedName}`);
    } finally {
      // Ignored: the outcome is already decided and the process moves on
      await pg.end().catch(() => {});
    }
  },
  resolves: (host) =>
    lookup(host).then(
      () => true,
      () => false,
    ),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  now: () => Date.now(),
  log: (line) => console.log(line),
}).then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
