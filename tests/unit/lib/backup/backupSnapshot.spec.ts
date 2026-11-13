import fsSync from "fs";
import os from "os";
import path from "path";
import { BackupError } from "@/lib/backup/manifest";
import { pruneSnapshots, readSnapshot, snapshotDir } from "@/lib/backup/snapshot";
import { APP_CONSTANTS } from "@/lib/constants";

describe("snapshotDir", () => {
  it("scopes snapshots to the user, under the uploads volume", () => {
    expect(snapshotDir("u1")).toBe(
      path.join(APP_CONSTANTS.UPLOADS_DIR, "backups", "u1"),
    );
  });

  it("gives two users disjoint directories", () => {
    expect(snapshotDir("u1")).not.toBe(snapshotDir("u2"));
  });
});

describe("readSnapshot id validation", () => {
  // Each of these would escape the per-user directory if the id were joined
  // straight onto it. The per-user directory alone is not the guard.
  it.each([
    "../../../etc/passwd",
    "../u2/pre-import-2026-08-14T1032.zip",
    "/data/prod.db",
    "pre-import-2026-08-14T1032.zip/../../../dev.db",
    "..",
    "",
  ])("refuses %s", async (id) => {
    await expect(readSnapshot("u1", id)).rejects.toBeInstanceOf(BackupError);
  });

  it("refuses a name that is not a snapshot at all", async () => {
    await expect(readSnapshot("u1", "resume.pdf")).rejects.toBeInstanceOf(
      BackupError,
    );
  });
});

// Deleting files is the one thing in this module that cannot be undone, and
// the byte rule has two ways to go wrong: dropping too much, or dropping the
// newest. Both are asserted directly.
describe("pruneSnapshots", () => {
  const originalUploads = APP_CONSTANTS.UPLOADS_DIR;
  const originalMaxTotalBytes = APP_CONSTANTS.BACKUP_SNAPSHOT_MAX_TOTAL_BYTES;
  let dir: string;

  const write = (name: string, bytes: number) =>
    fsSync.writeFileSync(path.join(dir, name), Buffer.alloc(bytes));

  const stamped = (n: number) => `pre-import-2026-08-14T10-0${n}-00-000Z.zip`;

  beforeEach(() => {
    const root = fsSync.mkdtempSync(path.join(os.tmpdir(), "jobsync-snap-"));
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = root;
    // Kept tiny so the byte-budget tests don't write real 100s-of-MB
    // files to disk — the boundary logic is the same at any scale.
    (APP_CONSTANTS as { BACKUP_SNAPSHOT_MAX_TOTAL_BYTES: number }).BACKUP_SNAPSHOT_MAX_TOTAL_BYTES = 10_000;
    dir = snapshotDir("u1");
    fsSync.mkdirSync(dir, { recursive: true });
  });

  afterEach(() => {
    (APP_CONSTANTS as { UPLOADS_DIR: string }).UPLOADS_DIR = originalUploads;
    (APP_CONSTANTS as { BACKUP_SNAPSHOT_MAX_TOTAL_BYTES: number }).BACKUP_SNAPSHOT_MAX_TOTAL_BYTES =
      originalMaxTotalBytes;
  });

  it("drops everything past the keep count, oldest first", async () => {
    for (let n = 1; n <= 5; n++) write(stamped(n), 16);
    await pruneSnapshots("u1", 3);
    expect(fsSync.readdirSync(dir).sort()).toEqual([
      stamped(3),
      stamped(4),
      stamped(5),
    ]);
  });

  it("drops within the keep count once the byte budget is passed", async () => {
    const big = APP_CONSTANTS.BACKUP_SNAPSHOT_MAX_TOTAL_BYTES / 2 + 1024;
    write(stamped(1), big);
    write(stamped(2), big);
    write(stamped(3), big);
    await pruneSnapshots("u1", 5);
    expect(fsSync.readdirSync(dir)).toEqual([stamped(3)]);
  });

  it("keeps the newest even when it alone exceeds the budget", async () => {
    write(stamped(1), APP_CONSTANTS.BACKUP_SNAPSHOT_MAX_TOTAL_BYTES + 1024);
    await pruneSnapshots("u1", 5);
    expect(fsSync.readdirSync(dir)).toEqual([stamped(1)]);
  });

  it("ignores files that are not snapshots", async () => {
    write("notes.txt", 16);
    write(stamped(1), 16);
    await pruneSnapshots("u1", 0);
    expect(fsSync.readdirSync(dir)).toEqual(["notes.txt"]);
  });
});
