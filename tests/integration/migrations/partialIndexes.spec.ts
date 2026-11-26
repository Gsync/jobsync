// @vitest-environment node
import type { PrismaClient } from "@/generated/prisma/client";
import { createPrismaClient } from "@/lib/db";
import { dropTestSchema, seedAccount } from "../backup/helpers/backupTestDb";
import { applyMigrations, makeMigratedDbUrl } from "./helpers/migratedDb";

const ctx = makeMigratedDbUrl();

// Only dereferenced inside the skipped-when-absent describe below
const prisma = ctx
  ? createPrismaClient(ctx.url)
  : (undefined as unknown as PrismaClient);

const UNIQUE_VIOLATION = { code: "P2002" };

let userId: string;
let automationId: string;
let jobRefs: { statusId: string; jobTitleId: string; companyId: string };
let stageTypeId: string;

beforeAll(async () => {
  if (!ctx) return;
  await applyMigrations(ctx.url);
  userId = await seedAccount(prisma, "owner@example.com");
  const company = await prisma.company.create({
    data: { label: "Acme", value: "acme", createdBy: userId },
  });
  const jobTitle = await prisma.jobTitle.create({
    data: { label: "Engineer", value: "engineer", createdBy: userId },
  });
  const status = await prisma.jobStatus.findFirstOrThrow();
  const stageType = await prisma.jobStageType.findFirstOrThrow();
  stageTypeId = stageType.id;
  jobRefs = { statusId: status.id, jobTitleId: jobTitle.id, companyId: company.id };
  const profile = await prisma.profile.create({ data: { userId } });
  const resume = await prisma.resume.create({
    data: { profileId: profile.id, title: "Main" },
  });
  const automation = await prisma.automation.create({
    data: {
      userId,
      name: "Daily",
      jobBoard: "indeed",
      keywords: "engineer",
      location: "Remote",
      resumeId: resume.id,
      scheduleHour: 8,
    },
  });
  automationId = automation.id;
}, 60_000);

afterAll(async () => {
  if (!ctx) return;
  await dropTestSchema(prisma, ctx.schema);
  await prisma.$disconnect();
});

const makeJob = (data: { jobUrl: string; automationId?: string }) =>
  prisma.job.create({
    data: {
      userId,
      description: "d",
      jobType: "FT",
      createdAt: new Date(),
      ...jobRefs,
      ...data,
    },
  });

describe.skipIf(!ctx)("partial unique indexes, applied from the migrations", () => {
  it("creates all three with their WHERE predicates", async () => {
    const rows = await prisma.$queryRaw<{ indexname: string; indexdef: string }[]>`
      SELECT indexname, indexdef FROM pg_indexes
      WHERE schemaname = ${ctx!.schema} AND indexname IN (
        'AutomationRun_automationId_active_key',
        'Job_userId_jobUrl_automation_key',
        'JobStage_jobId_current_key')`;
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.indexdef.includes("WHERE"))).toBe(true);
  });

  it("allows one running run per automation and rejects a second", async () => {
    await prisma.automationRun.create({ data: { automationId, status: "running" } });
    await expect(
      prisma.automationRun.create({ data: { automationId, status: "cancelling" } }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
    await prisma.automationRun.create({ data: { automationId, status: "completed" } });
  });

  it("rejects a second automation job with the same URL but not a manual one", async () => {
    await makeJob({ jobUrl: "https://x.test/1", automationId });
    await expect(
      makeJob({ jobUrl: "https://x.test/1", automationId }),
    ).rejects.toMatchObject(UNIQUE_VIOLATION);
    await makeJob({ jobUrl: "https://x.test/1" });
    await makeJob({ jobUrl: "https://x.test/1" });
  });

  it("allows one current stage per job and rejects a second", async () => {
    const job = await makeJob({ jobUrl: "https://x.test/stages" });
    const stage = (isCurrent: boolean) =>
      prisma.jobStage.create({ data: { jobId: job.id, stageTypeId, isCurrent } });
    await stage(true);
    await stage(false);
    await expect(stage(true)).rejects.toMatchObject(UNIQUE_VIOLATION);
  });
});
