import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import type * as Snapshot from "../src/generated/sqlite-snapshot";
import { runImport } from "./import/run";

// Resolved from the working directory, not this file: the compiled copy in
// scripts/dist sits one level deeper than this source does.
const snapshot: typeof Snapshot = require(
  path.resolve(process.cwd(), "src/generated/sqlite-snapshot"),
);

async function main(): Promise<number> {
  const target = new PrismaClient();
  try {
    return await runImport({
      env: process.env,
      fileExists: (file) => fs.existsSync(file),
      readText: (file) => fs.readFileSync(file, "utf8"),
      writeText: (file, text) => fs.writeFileSync(file, text),
      openSource: (url) => new snapshot.PrismaClient({ datasources: { db: { url } } }),
      target,
      // The snapshot's model list, so the copy never asks the old database
      // for a model that only the newer Postgres schema has.
      models: snapshot.Prisma.dmmf.datamodel.models,
      log: (line) => console.log(line),
      now: () => new Date(),
    });
  } finally {
    await target.$disconnect();
  }
}

main().then(
  (code) => process.exit(code),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  },
);
