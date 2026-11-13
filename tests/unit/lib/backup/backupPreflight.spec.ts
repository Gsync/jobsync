import JSZip from "jszip";
import db from "@/lib/db";
import { preflightBackup } from "@/lib/backup/import";
import { BackupError } from "@/lib/backup/manifest";
import { BackupDataSchema } from "@/lib/backup/schema";
import { buildManifest } from "@/lib/backup/manifest";

vi.mock("@/lib/db", () => {
  const counted = () => ({ count: vi.fn().mockResolvedValue(0) });
  return {
    default: {
      profile: counted(),
      resume: counted(),
      coverLetter: counted(),
      job: counted(),
      note: counted(),
      contact: counted(),
      task: counted(),
      activity: counted(),
      question: counted(),
      automation: counted(),
    },
  };
});

const mockDb = db as unknown as Record<string, { count: ReturnType<typeof vi.fn> }>;

async function zipWith(manifest: unknown): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("manifest.json", JSON.stringify(manifest));
  zip.file("data.json", JSON.stringify(BackupDataSchema.parse({})));
  return zip.generateAsync({ type: "nodebuffer" });
}

const manifest = () => buildManifest(BackupDataSchema.parse({}), "owner@example.com");

describe("preflightBackup", () => {
  it("returns the manifest without writing anything", async () => {
    const result = await preflightBackup(
      await zipWith(manifest()),
      "user-1",
      "owner@example.com",
    );
    expect(result.manifest.sourceEmail).toBe("owner@example.com");
    expect(result.emailMatches).toBe(true);
  });

  it("flags a source email that does not match the target account", async () => {
    const result = await preflightBackup(
      await zipWith(manifest()),
      "user-1",
      "someone.else@example.com",
    );
    expect(result.emailMatches).toBe(false);
  });

  it("reports a freshly signed-up account as empty", async () => {
    const result = await preflightBackup(
      await zipWith(manifest()),
      "user-1",
      "owner@example.com",
    );
    expect(result.targetIsEmpty).toBe(true);
    expect(result.targetCounts.Job).toBe(0);
  });

  it("reports an account holding only a Profile as non-empty", async () => {
    mockDb.profile.count.mockResolvedValueOnce(1);
    const result = await preflightBackup(
      await zipWith(manifest()),
      "user-1",
      "owner@example.com",
    );
    expect(result.targetIsEmpty).toBe(false);
    expect(result.targetCounts.Profile).toBe(1);
  });

  it("refuses a backup with the wrong formatVersion", async () => {
    const bad = { ...manifest(), formatVersion: 99 };
    await expect(
      preflightBackup(await zipWith(bad), "user-1", "owner@example.com"),
    ).rejects.toBeInstanceOf(BackupError);
  });
});
