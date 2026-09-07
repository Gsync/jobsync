// @vitest-environment node
import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { APP_CONSTANTS } from "@/lib/constants";
import { buildBackupZip } from "@/lib/backup/export";
import { importBackup } from "@/lib/backup/import";
import { listSnapshots, readSnapshot } from "@/lib/backup/snapshot";
import { seedAccount } from "./helpers/backupTestDb";

// Async so the helper can be pulled in with a dynamic import — `require` is
// not defined in a Vite-transformed ESM test file.
const ctx = await vi.hoisted(async () => {
  const helpers = await import("./helpers/backupTestDb");
  const { url, dir } = helpers.makeTestDbUrl();
  helpers.pushSchema(url);
  return { url, dir };
});

vi.mock("@/lib/db", async () => {
  const { PrismaClient } = await import("@prisma/client");
  return {
    default: new PrismaClient({ datasources: { db: { url: ctx.url } } }),
  };
});

// Never start the cron in a test run.
vi.mock("@/lib/scheduler", () => ({ syncSchedulerState: vi.fn() }));

const prisma = new PrismaClient({ datasources: { db: { url: ctx.url } } });

let userId: string;
let uploadsDir: string;
const originalUploads = APP_CONSTANTS.UPLOADS_DIR;

beforeAll(async () => {
  uploadsDir = path.join(ctx.dir, "uploads");
  fs.mkdirSync(path.join(uploadsDir, "files", "resumes"), { recursive: true });
  (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = uploadsDir;

  userId = await seedAccount(prisma, "owner@example.com");
  await seedFullAccount();
}, 120_000);

afterAll(async () => {
  (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = originalUploads;
  await prisma.$disconnect();
  fs.rmSync(ctx.dir, { recursive: true, force: true });
});

async function seedFullAccount() {
  const company = await prisma.company.create({
    data: {
      label: "Acme",
      value: "acme",
      createdBy: userId,
      watched: true,
      watchedAt: new Date("2026-09-01T10:00:00.000Z"),
      atsProvider: "greenhouse",
      atsToken: "acme",
      atsHost: null,
      websiteUrl: "https://acme.example.com",
      careersUrl: "https://acme.example.com/careers",
      industry: "Widgets",
    },
  });
  const title = await prisma.jobTitle.create({
    data: { label: "Engineer", value: "engineer", createdBy: userId },
  });
  const tag = await prisma.tag.create({
    data: { label: "Remote", value: "remote", createdBy: userId },
  });
  const status = await prisma.jobStatus.findFirstOrThrow({ where: { value: "applied" } });

  const profile = await prisma.profile.create({ data: { userId } });

  const resumeFilePath = path.join(uploadsDir, "files", "resumes", "seed-resume.pdf");
  fs.writeFileSync(resumeFilePath, Buffer.from("%PDF-1.4 seed"));
  const file = await prisma.file.create({
    data: {
      fileName: "resume.pdf",
      filePath: resumeFilePath,
      fileType: "application/pdf",
    },
  });
  const resume = await prisma.resume.create({
    data: { profileId: profile.id, title: "My CV", FileId: file.id },
  });
  await prisma.contactInfo.create({
    data: {
      resumeId: resume.id,
      firstName: "A",
      lastName: "B",
      headline: "Engineer",
      email: "a@b.com",
      phone: "123",
    },
  });
  const summary = await prisma.summary.create({ data: { content: "Summary text" } });
  const section = await prisma.resumeSection.create({
    data: {
      resumeId: resume.id,
      sectionTitle: "Summary",
      sectionType: "summary",
      summaryId: summary.id,
    },
  });
  await prisma.skill.create({
    data: { tagId: tag.id, resumeSectionId: section.id, category: "Languages", order: 1 },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { defaultResumeId: resume.id },
  });

  const job = await prisma.job.create({
    data: {
      userId,
      description: "A job",
      jobType: "full-time",
      createdAt: new Date(),
      statusId: status.id,
      jobTitleId: title.id,
      companyId: company.id,
      tags: { connect: { id: tag.id } },
    },
  });
  await prisma.note.create({
    data: { jobId: job.id, userId, content: "a note" },
  });

  const question = await prisma.question.create({
    data: { question: "Why us?", createdBy: userId, tags: { connect: { id: tag.id } } },
  });
  expect(question.id).toBeTruthy();

  const activityType = await prisma.activityType.create({
    data: { label: "Applying", value: "applying", createdBy: userId },
  });
  const task = await prisma.task.create({
    data: { userId, title: "Apply to Acme", activityTypeId: activityType.id },
  });
  await prisma.activity.create({
    data: {
      userId,
      activityName: "Applying",
      startTime: new Date(),
      activityTypeId: activityType.id,
      taskId: task.id,
    },
  });

  const automation = await prisma.automation.create({
    data: {
      userId,
      name: "Nightly",
      jobBoard: "greenhouse",
      keywords: "engineer",
      location: "Remote",
      resumeId: resume.id,
      scheduleHour: 9,
      nextRunAt: new Date("2020-01-01T09:00:00"),
      status: "active",
    },
  });
  // A run left mid-flight in the backup, which must not survive as running.
  await prisma.automationRun.create({
    data: { automationId: automation.id, status: "cancelling" },
  });

  // Rows the wipe must not touch, and one it must.
  await prisma.apiKey.create({
    data: { userId, provider: "openai", encryptedKey: "e", iv: "i", last4: "1234" },
  });
  await prisma.mcpAccessToken.create({
    data: {
      userId,
      name: "cli",
      tokenHash: "hash",
      tokenPrefix: "js_",
      scopes: "[]",
      expiresAt: new Date(Date.now() + 86_400_000),
    },
  });
  await prisma.chatConversation.create({
    data: { userId, messages: "[]" },
  });
}

describe("backup round trip", () => {
  it("restores every row, relation and file over an existing account", async () => {
    const { buffer } = await buildBackupZip(userId, "owner@example.com");

    // Add a lookup the backup does not contain, so replace-not-merge is testable.
    await prisma.company.create({
      data: { label: "Ghost", value: "ghost", createdBy: userId },
    });

    // The in-flight run in the backup must not block the target-side guard, so
    // clear the target's own run first — the guard is asserted separately.
    await prisma.automationRun.updateMany({
      where: { status: { in: ["running", "cancelling"] } },
      data: { status: "failed", completedAt: new Date() },
    });

    const result = await importBackup(buffer, userId, "owner@example.com", true);

    expect(result.counts.Job).toBe(1);
    expect(result.filesWritten).toBe(1);

    // The safety net exists on disk and is a real, readable backup.
    expect(result.snapshotPath).toBeTruthy();
    expect(fs.existsSync(result.snapshotPath!)).toBe(true);
    expect(result.snapshotPath!.startsWith(path.join(uploadsDir, "backups", userId))).toBe(
      true,
    );

    // Lookups are replaced, not merged.
    const companies = await prisma.company.findMany({ where: { createdBy: userId } });
    expect(companies.map((c) => c.value).sort()).toEqual(["acme"]);

    // Tag associations survive on both sides.
    const job = await prisma.job.findFirstOrThrow({
      where: { userId },
      include: { tags: true, Company: true, Status: true, Notes: true },
    });
    expect(job.tags.map((t) => t.value)).toEqual(["remote"]);
    expect(job.Company.label).toBe("Acme");
    expect(job.Status.value).toBe("applied");
    expect(job.Notes).toHaveLength(1);

    const question = await prisma.question.findFirstOrThrow({
      where: { createdBy: userId },
      include: { tags: true },
    });
    expect(question.tags.map((t) => t.value)).toEqual(["remote"]);

    // Summary ordering: the section imported with its summary attached.
    const section = await prisma.resumeSection.findFirstOrThrow({
      where: { Resume: { profile: { userId } } },
      include: { summary: true, skills: { include: { Tag: true } } },
    });
    expect(section.summary?.content).toBe("Summary text");
    expect(section.skills[0].Tag.value).toBe("remote");

    // defaultResumeId points at the new resume, not the old id.
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const resume = await prisma.resume.findFirstOrThrow({
      where: { profile: { userId } },
    });
    expect(user.defaultResumeId).toBe(resume.id);

    // Activity -> Task survived.
    const activity = await prisma.activity.findFirstOrThrow({
      where: { userId },
      include: { task: true },
    });
    expect(activity.task?.title).toBe("Apply to Acme");

    // In-flight state normalized on the way in.
    const run = await prisma.automationRun.findFirstOrThrow({
      where: { automation: { userId } },
    });
    expect(run.status).toBe("failed");
    expect(run.errorMessage).toBe("interrupted");

    const automation = await prisma.automation.findFirstOrThrow({ where: { userId } });
    expect(automation.status).toBe("active");
    expect(automation.nextRunAt!.getTime()).toBeGreaterThan(Date.now());

    // The wipe set is honoured in both directions.
    expect(await prisma.apiKey.count({ where: { userId } })).toBe(1);
    expect(await prisma.mcpAccessToken.count({ where: { userId } })).toBe(1);
    expect(await prisma.chatConversation.count({ where: { userId } })).toBe(0);

    // filePath was recomputed and the bytes are actually there.
    const file = await prisma.file.findFirstOrThrow({
      where: { Resume: { profile: { userId } } },
    });
    expect(file.filePath.startsWith(path.join(uploadsDir, "files", "resumes"))).toBe(
      true,
    );
    expect(fs.existsSync(file.filePath)).toBe(true);
    expect(fs.readFileSync(file.filePath).toString()).toContain("seed");
  }, 120_000);

  it("restores every watchlist column on Company, watchedAt as a Date", async () => {
    const [restored] = await prisma.company.findMany({
      where: { createdBy: userId, value: "acme" },
    });

    expect(restored.watched).toBe(true);
    expect(restored.watchedAt).toBeInstanceOf(Date);
    expect(restored.watchedAt?.toISOString()).toBe("2026-09-01T10:00:00.000Z");
    expect(restored.atsProvider).toBe("greenhouse");
    expect(restored.atsToken).toBe("acme");
    expect(restored.atsHost).toBeNull();
    expect(restored.websiteUrl).toBe("https://acme.example.com");
    expect(restored.careersUrl).toBe("https://acme.example.com/careers");
    expect(restored.industry).toBe("Widgets");
  });

  it("does not demand confirmWipe on a freshly signed-up account", async () => {
    const freshUserId = await seedAccount(prisma, "fresh@example.com");
    const { buffer } = await buildBackupZip(userId, "owner@example.com");

    // No confirmWipe: the seeded JobSource rows must not count as data.
    const result = await importBackup(
      buffer,
      freshUserId,
      "fresh@example.com",
      false,
    );
    // Nothing to snapshot on an empty account.
    expect(result.snapshotPath).toBeNull();
  }, 120_000);

  it("rolls back to the snapshot an import took", async () => {
    const rollbackUserId = await seedAccount(prisma, "rollback@example.com");
    // A content row, not just the lookup below: EMPTINESS_MODELS deliberately
    // excludes lookup models, so a Company alone would read as an empty target
    // and importBackup would skip the snapshot this test is asserting on.
    await prisma.profile.create({ data: { userId: rollbackUserId } });
    await prisma.company.create({
      data: { label: "Before", value: "before", createdBy: rollbackUserId },
    });

    // Import someone else's backup over it, then undo that.
    const { buffer } = await buildBackupZip(userId, "owner@example.com");
    const imported = await importBackup(
      buffer,
      rollbackUserId,
      "rollback@example.com",
      true,
    );
    expect(imported.snapshotPath).toBeTruthy();
    expect(
      (await prisma.company.findMany({ where: { createdBy: rollbackUserId } }))
        .map((c) => c.value),
    ).not.toContain("before");

    const snapshots = await listSnapshots(rollbackUserId);
    const bytes = await readSnapshot(rollbackUserId, snapshots[0].id);
    await importBackup(bytes, rollbackUserId, "rollback@example.com", true);

    const after = await prisma.company.findMany({
      where: { createdBy: rollbackUserId },
    });
    expect(after.map((c) => c.value)).toEqual(["before"]);
  }, 120_000);

  // The regression test for the file gate. A tampered backup is the realistic
  // hostile input for this feature: the zip is structurally valid and the rows
  // are fine, but a file entry has been swapped for something that is not a
  // resume. The row must survive and the bytes must not reach disk.
  it("drops a file entry whose bytes are not a resume, without failing the import", async () => {
    const { buffer } = await buildBackupZip(userId, "owner@example.com");

    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(buffer);
    // Directory entries (e.g. "files/") also start with the prefix and sort
    // before the real file entry in JSZip's insertion order — exclude them.
    const entryName = Object.keys(zip.files).find(
      (n) => n.startsWith("files/") && !zip.files[n].dir,
    )!;
    zip.file(entryName, Buffer.from("MZ\x90\x00 definitely not a PDF"));
    const tampered = await zip.generateAsync({ type: "nodebuffer" });

    await prisma.automationRun.updateMany({
      where: { status: { in: ["running", "cancelling"] } },
      data: { status: "failed", completedAt: new Date() },
    });

    const result = await importBackup(tampered, userId, "owner@example.com", true);

    expect(result.filesWritten).toBe(0);
    expect(result.counts.File).toBe(1);

    const file = await prisma.file.findFirstOrThrow({
      where: { Resume: { profile: { userId } } },
    });
    expect(fs.existsSync(file.filePath)).toBe(false);

    // Nothing outside the resumes directory was created either.
    const resumesDir = path.join(uploadsDir, "files", "resumes");
    expect(file.filePath.startsWith(resumesDir)).toBe(true);
    expect(
      fs.readdirSync(resumesDir).some((n) => n.includes("MZ") || n.endsWith(".exe")),
    ).toBe(false);
  }, 120_000);

  it("refuses before any write when the target has an active run", async () => {
    const automation = await prisma.automation.findFirstOrThrow({ where: { userId } });
    await prisma.automationRun.create({
      data: { automationId: automation.id, status: "running" },
    });

    const { buffer } = await buildBackupZip(userId, "owner@example.com");
    const jobsBefore = await prisma.job.count({ where: { userId } });

    await expect(
      importBackup(buffer, userId, "owner@example.com", true),
    ).rejects.toThrow(/wait/i);
    expect(await prisma.job.count({ where: { userId } })).toBe(jobsBefore);
  }, 120_000);
});
