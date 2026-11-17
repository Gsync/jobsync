import JSZip from "jszip";
import {
  BackupError,
  buildManifest,
  countRows,
  openBackupZip,
  readManifest,
} from "@/lib/backup/manifest";
import { BackupDataSchema } from "@/lib/backup/schema";
import { APP_CONSTANTS } from "@/lib/constants";

const emptyData = BackupDataSchema.parse({});

async function zipOf(entries: Record<string, string>): Promise<Buffer> {
  const zip = new JSZip();
  for (const [name, content] of Object.entries(entries)) zip.file(name, content);
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("buildManifest", () => {
  it("stamps the format version, the source email and per-model counts", () => {
    const data = BackupDataSchema.parse({
      Tag: [
        { id: "t1", label: "A", value: "a" },
        { id: "t2", label: "B", value: "b" },
      ],
    });
    const manifest = buildManifest(data, "me@example.com");
    expect(manifest.formatVersion).toBe(1);
    expect(manifest.sourceEmail).toBe("me@example.com");
    expect(manifest.counts.Tag).toBe(2);
    expect(manifest.counts.Job).toBe(0);
    expect(manifest.appVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(() => new Date(manifest.exportedAt).toISOString()).not.toThrow();
  });

  it("counts the join tables alongside the model groups", () => {
    const data = BackupDataSchema.parse({
      _JobToTag: [{ jobId: "j1", tagId: "t1" }],
    });
    expect(countRows(data)._JobToTag).toBe(1);
  });
});

describe("openBackupZip", () => {
  it("opens a zip under the caps", async () => {
    const zip = await openBackupZip(await zipOf({ "manifest.json": "{}" }));
    expect(zip.file("manifest.json")).not.toBeNull();
  });

  it("refuses a zip with too many entries", async () => {
    const entries: Record<string, string> = {};
    for (let i = 0; i < APP_CONSTANTS.BACKUP_MAX_ENTRIES + 1; i++) {
      entries[`f${i}.txt`] = "x";
    }
    await expect(openBackupZip(await zipOf(entries))).rejects.toBeInstanceOf(
      BackupError,
    );
  });

  it("refuses a file that is not a zip at all", async () => {
    await expect(
      openBackupZip(Buffer.from("this is not a zip")),
    ).rejects.toBeInstanceOf(BackupError);
  });

  // The actual zip bomb. Without this the uncompressed cap is untested, and
  // the cap is the one guard standing between an untrusted archive and the
  // heap — it must fail loudly if the central-directory read ever regresses.
  it("refuses a zip that expands past the uncompressed cap", async () => {
    const bomb = "a".repeat(
      APP_CONSTANTS.BACKUP_MAX_UNCOMPRESSED_BYTES + 1024,
    );
    await expect(
      openBackupZip(await zipOf({ "data.json": bomb })),
    ).rejects.toBeInstanceOf(BackupError);
  });
});

describe("readManifest", () => {
  it("reads a valid manifest", async () => {
    const manifest = buildManifest(emptyData, "me@example.com");
    const zip = await openBackupZip(
      await zipOf({ "manifest.json": JSON.stringify(manifest) }),
    );
    expect((await readManifest(zip)).sourceEmail).toBe("me@example.com");
  });

  it("refuses a missing manifest", async () => {
    const zip = await openBackupZip(await zipOf({ "data.json": "{}" }));
    await expect(readManifest(zip)).rejects.toBeInstanceOf(BackupError);
  });

  it("refuses malformed JSON", async () => {
    const zip = await openBackupZip(await zipOf({ "manifest.json": "{oops" }));
    await expect(readManifest(zip)).rejects.toBeInstanceOf(BackupError);
  });

  it("names both versions when formatVersion does not match", async () => {
    const manifest = { ...buildManifest(emptyData, "a@b.com"), formatVersion: 2 };
    const zip = await openBackupZip(
      await zipOf({ "manifest.json": JSON.stringify(manifest) }),
    );
    await expect(readManifest(zip)).rejects.toThrow(/version 1.*found 2|found 2/i);
  });
});
