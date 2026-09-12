import JSZip from "jszip";
import db from "@/lib/db";
import { importBackup } from "@/lib/backup/import";
import { BackupError, buildManifest } from "@/lib/backup/manifest";
import { BackupDataSchema } from "@/lib/backup/schema";
import { syncSchedulerState } from "@/lib/scheduler";
import { writeSnapshot } from "@/lib/backup/snapshot";

vi.mock("@/lib/scheduler", () => ({ syncSchedulerState: vi.fn() }));

// Mocked so the guards spec never touches the filesystem; Task 4.1 covers the
// real thing and Task 7.2 exercises it end to end.
vi.mock("@/lib/backup/snapshot", () => ({
  writeSnapshot: vi.fn().mockResolvedValue("data/backups/user-1/pre-import-x.zip"),
}));

vi.mock("@/lib/db", () => {
  const counted = () => ({ count: vi.fn().mockResolvedValue(0), deleteMany: vi.fn(), createMany: vi.fn(), findMany: vi.fn().mockResolvedValue([]), create: vi.fn(), update: vi.fn(), upsert: vi.fn(), findFirst: vi.fn().mockResolvedValue(null) });
  const mock: Record<string, unknown> = {
    automationRun: { ...counted(), findFirst: vi.fn().mockResolvedValue(null) },
    jobStatus: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn().mockResolvedValue({ defaultResumeId: null }) },
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => fn(mock)),
  };
  for (const key of [
    "company", "jobTitle", "location", "jobSource", "tag", "activityType",
    "profile", "file", "resume", "contactInfo", "summary", "resumeSection",
    "workExperience", "education", "licenseOrCertification", "otherSection",
    "skill", "coverLetter", "automation", "job", "note", "interview",
    "contact", "contactRole", "jobContact", "task", "activity", "question", "userSettings",
    "chatConversation",
  ]) {
    mock[key] = counted();
  }
  return { default: mock };
});

const mockDb = db as unknown as Record<string, Record<string, ReturnType<typeof vi.fn>>>;

async function emptyBackup(): Promise<Buffer> {
  const data = BackupDataSchema.parse({});
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(buildManifest(data, "owner@example.com")));
  zip.file("data.json", JSON.stringify(data));
  return zip.generateAsync({ type: "nodebuffer" });
}

const EMAIL = "owner@example.com";

describe("importBackup guards", () => {
  it("refuses a non-empty target without confirmWipe", async () => {
    mockDb.job.count.mockResolvedValueOnce(4);
    await expect(
      importBackup(await emptyBackup(), "user-1", EMAIL, false),
    ).rejects.toThrow(/confirm/i);
    expect(mockDb.job.deleteMany).not.toHaveBeenCalled();
  });

  it("refuses before any write when the target has a run in flight", async () => {
    mockDb.automationRun.findFirst.mockResolvedValueOnce({ id: "run-1" });
    await expect(
      importBackup(await emptyBackup(), "user-1", EMAIL, true),
    ).rejects.toThrow(/automation.*running|wait/i);
    expect(mockDb.job.deleteMany).not.toHaveBeenCalled();
  });

  it("queries only running and cancelling runs for that guard", async () => {
    await importBackup(await emptyBackup(), "user-1", EMAIL, true);
    const where = mockDb.automationRun.findFirst.mock.calls[0][0].where;
    expect(where.status).toEqual({ in: ["running", "cancelling"] });
    expect(JSON.stringify(where)).toContain("user-1");
  });

  // A JWT outlives the database it was minted against: a fresh container with
  // a new dev.db still accepts the old cookie, and every scoped read comes
  // back empty rather than failing.
  it("refuses a session whose user row no longer exists", async () => {
    mockDb.user.findUnique.mockResolvedValueOnce(null);
    await expect(
      importBackup(await emptyBackup(), "user-1", EMAIL, true),
    ).rejects.toThrow(/sign in again/i);
    expect(mockDb.job.deleteMany).not.toHaveBeenCalled();
    expect(writeSnapshot).not.toHaveBeenCalled();
  });

  it("refuses a payload whose data.json fails validation", async () => {
    const zip = new JSZip();
    const data = BackupDataSchema.parse({});
    zip.file("manifest.json", JSON.stringify(buildManifest(data, "a@b.com")));
    zip.file("data.json", JSON.stringify({ Job: [{ id: "j1" }] }));
    const bytes = await zip.generateAsync({ type: "nodebuffer" });
    await expect(
      importBackup(bytes, "user-1", EMAIL, true),
    ).rejects.toBeInstanceOf(BackupError);
    expect(mockDb.job.deleteMany).not.toHaveBeenCalled();
  });

  it("syncs the scheduler after a successful import", async () => {
    await importBackup(await emptyBackup(), "user-1", EMAIL, true);
    expect(syncSchedulerState).toHaveBeenCalled();
  });

  it("wipes ChatConversation but never ApiKey or McpAccessToken", async () => {
    await importBackup(await emptyBackup(), "user-1", EMAIL, true);
    expect(mockDb.chatConversation.deleteMany).toHaveBeenCalled();
    expect(mockDb.apiKey).toBeUndefined();
    expect(mockDb.mcpAccessToken).toBeUndefined();
  });

  // The ordering that makes the safety net real: a snapshot that is written
  // after the wipe is a snapshot of nothing.
  it("snapshots a non-empty target before deleting anything", async () => {
    mockDb.job.count.mockResolvedValueOnce(4);
    const result = await importBackup(await emptyBackup(), "user-1", EMAIL, true);

    expect(writeSnapshot).toHaveBeenCalledWith("user-1", EMAIL);
    expect(result.snapshotPath).toBeTruthy();
    expect(
      (writeSnapshot as ReturnType<typeof vi.fn>).mock.invocationCallOrder[0],
    ).toBeLessThan(mockDb.job.deleteMany.mock.invocationCallOrder[0]);
  });

  it("skips the snapshot on an empty target", async () => {
    const result = await importBackup(await emptyBackup(), "user-1", EMAIL, true);
    expect(writeSnapshot).not.toHaveBeenCalled();
    expect(result.snapshotPath).toBeNull();
  });
});
