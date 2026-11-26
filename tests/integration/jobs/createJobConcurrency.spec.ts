// @vitest-environment node
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/db";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { dropTestSchema, seedAccount } from "../backup/helpers/backupTestDb";
import { applyMigrations } from "../migrations/helpers/migratedDb";

// Async so the helper can be pulled in with a dynamic import — `require` is
// not defined in a Vite-transformed ESM test file.
const ctx = await vi.hoisted(async () => {
  const helpers = await import("../migrations/helpers/migratedDb");
  return helpers.makeMigratedDbUrl();
});

vi.mock("@/lib/db", async () => {
  const { createPrismaClient } =
    await vi.importActual<typeof import("@/lib/db")>("@/lib/db");
  return { default: ctx ? createPrismaClient(ctx.url) : {}, createPrismaClient };
});

// Only dereferenced inside the skipped-when-absent describe below
const prisma = ctx
  ? createPrismaClient(ctx.url)
  : (undefined as unknown as PrismaClient);

let userId: string;

beforeAll(async () => {
  if (!ctx) return;
  await applyMigrations(ctx.url);
  userId = await seedAccount(prisma, "owner@example.com");
}, 60_000);

afterAll(async () => {
  if (!ctx) return;
  await dropTestSchema(prisma, ctx.schema);
  await prisma.$disconnect();
});

const save = (input: { company: string; jobUrl?: string }) =>
  createJobFromNames(
    { ...input, jobTitle: "Engineer", jobDescription: "Build things" },
    userId,
  );

describe.skipIf(!ctx)("saving the same job twice at once, on real Postgres", () => {
  it("saves one job and refuses the other, leaving one company", async () => {
    const results = await Promise.all([save({ company: "Acme" }), save({ company: "Acme" })]);

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(results.find((r) => !r.created)?.duplicateOf).toBeDefined();
    expect(await prisma.job.count({ where: { userId } })).toBe(1);
    expect(await prisma.company.count({ where: { createdBy: userId } })).toBe(1);
  });

  it("treats URL variants of one posting as the same job", async () => {
    const results = await Promise.all([
      save({ company: "Beta", jobUrl: "https://www.x.test/job/1?utm_source=a" }),
      save({ company: "Gamma", jobUrl: "https://x.test/job/1" }),
    ]);

    expect(results.filter((r) => r.created)).toHaveLength(1);
    expect(await prisma.job.count({ where: { userId } })).toBe(2);
    // The refused save created no Library entry for its company
    expect(await prisma.company.count({ where: { createdBy: userId } })).toBe(2);
  });
});
