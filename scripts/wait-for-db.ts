import { lookup } from "node:dns/promises";
import { PrismaClient } from "@prisma/client";
import { waitForDb } from "./wait/run";

const client = (url: string) => new PrismaClient({ datasources: { db: { url } } });

waitForDb({
  env: process.env,
  // $connect(), never a throwaway query: a lazy first query loses errorCode
  connect: async (url) => {
    const prisma = client(url);
    try {
      await prisma.$connect();
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  },
  // One standalone statement: CREATE DATABASE cannot run in a transaction
  createDatabase: async (url, quotedName) => {
    const prisma = client(url);
    try {
      await prisma.$executeRawUnsafe(`CREATE DATABASE ${quotedName}`);
    } finally {
      await prisma.$disconnect().catch(() => {});
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
