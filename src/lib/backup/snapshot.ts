import fs from "fs/promises";
import path from "path";
import { APP_CONSTANTS } from "@/lib/constants";
import { buildBackupZip } from "./export";
import { BackupError, openBackupZip, readManifest } from "./manifest";
import { log } from "@/lib/telemetry";

export interface SnapshotInfo {
  id: string;
  exportedAt: string;
  appVersion: string;
  counts: Record<string, number>;
  sizeBytes: number;
}

// Anchored, and deliberately narrow: the only names this accepts are ones
// writeSnapshot produced. A traversal segment cannot match it.
const SNAPSHOT_ID = /^pre-import-[0-9TZ.:-]+\.zip$/;

export function snapshotDir(userId: string): string {
  return path.join(APP_CONSTANTS.UPLOADS_DIR, "backups", userId);
}

export async function writeSnapshot(
  userId: string,
  email: string,
): Promise<string> {
  const { buffer } = await buildBackupZip(userId, email);
  const dir = snapshotDir(userId);
  await fs.mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const target = path.join(dir, `pre-import-${stamp}.zip`);
  await fs.writeFile(target, buffer);

  await pruneSnapshots(userId, APP_CONSTANTS.BACKUP_SNAPSHOT_KEEP);
  return target;
}

export async function listSnapshots(userId: string): Promise<SnapshotInfo[]> {
  const dir = snapshotDir(userId);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }

  const infos: SnapshotInfo[] = [];
  for (const name of names.filter((n) => SNAPSHOT_ID.test(n))) {
    try {
      const bytes = await fs.readFile(path.join(dir, name));
      const manifest = await readManifest(await openBackupZip(bytes));
      infos.push({
        id: name,
        exportedAt: manifest.exportedAt,
        appVersion: manifest.appVersion,
        counts: manifest.counts,
        sizeBytes: bytes.length,
      });
    } catch (error) {
      // An unreadable snapshot is skipped, not fatal — the list is a recovery
      // surface and must not be taken down by one bad file.
      log.warn("[Backup] Skipping unreadable snapshot", {
        "snapshot.name": name,
        error: String(error),
      });
    }
  }

  return infos.sort((a, b) => b.exportedAt.localeCompare(a.exportedAt));
}

export async function readSnapshot(
  userId: string,
  id: string,
): Promise<Buffer> {
  if (!SNAPSHOT_ID.test(id)) {
    throw new BackupError("That is not a valid snapshot.");
  }
  try {
    return await fs.readFile(path.join(snapshotDir(userId), id));
  } catch {
    throw new BackupError("That snapshot no longer exists.");
  }
}

// Prunes on count and on total bytes. The count alone is not a disk bound:
// nothing caps how large one snapshot is, these sit on the same volume as the
// SQLite database, and an import/rollback loop writes one every time. The
// newest is always kept, even if it alone exceeds the byte budget — dropping
// the only record of the state a user just left is worse than overshooting.
export async function pruneSnapshots(
  userId: string,
  keep: number,
): Promise<void> {
  const dir = snapshotDir(userId);
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return;
  }

  // Names are ISO-stamped, so a lexical sort is a chronological one.
  const newestFirst = names.filter((n) => SNAPSHOT_ID.test(n)).sort().reverse();

  const stale: string[] = [];
  let running = 0;

  for (const [index, name] of newestFirst.entries()) {
    if (index >= keep) {
      stale.push(name);
      continue;
    }
    const size = await fs
      .stat(path.join(dir, name))
      .then((s) => s.size)
      .catch(() => 0);
    running += size;
    if (index > 0 && running > APP_CONSTANTS.BACKUP_SNAPSHOT_MAX_TOTAL_BYTES) {
      stale.push(name);
    }
  }

  for (const name of stale) {
    await fs
      .unlink(path.join(dir, name))
      .catch((error) =>
        log.warn("[Backup] Could not prune snapshot", {
          "snapshot.name": name,
          error: String(error),
        }),
      );
  }
}
