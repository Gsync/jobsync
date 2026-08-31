import fs from "fs/promises";
import path from "path";
import type JSZip from "jszip";
import db from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { IdMap, buildCreateData } from "./idmap";
import { BackupError, openBackupZip, readManifest } from "./manifest";
import {
  checkImportedFile,
  importedFilePath,
  normalizeAutomation,
  normalizeAutomationRun,
  safeEntryName,
} from "./normalize";
import {
  DELETE_ORDER,
  EMPTINESS_MODELS,
  INSERT_ORDER,
  LOOKUP_MODELS,
  MODEL_SPECS,
  type BackupModel,
} from "./ordering";
import { writeSnapshot } from "./snapshot";
import { log } from "@/lib/telemetry";
import { BackupDataSchema, type BackupData, type BackupManifest } from "./schema";

export interface PreflightResult {
  manifest: BackupManifest;
  emailMatches: boolean;
  targetIsEmpty: boolean;
  targetCounts: Record<string, number>;
}

// Counts read from the target database, not from the file — the manifest is
// self-reported and cannot be allowed to size the destructive confirmation.
export async function countTargetContent(
  userId: string,
): Promise<Record<string, number>> {
  const entries = await Promise.all(
    EMPTINESS_MODELS.map(async (model) => {
      const spec = MODEL_SPECS[model];
      const delegate = (db as unknown as Record<string, { count: (a: unknown) => Promise<number> }>)[
        spec.delegate
      ];
      return [model, await delegate.count({ where: spec.scope(userId) })] as const;
    }),
  );
  return Object.fromEntries(entries);
}

// Reads manifest.json only, writes nothing to the database and nothing to disk.
export async function preflightBackup(
  bytes: Buffer,
  userId: string,
  userEmail: string,
): Promise<PreflightResult> {
  const zip = await openBackupZip(bytes);
  const manifest = await readManifest(zip);

  if (!zip.file("data.json")) {
    throw new BackupError("Backup is missing data.json.");
  }

  const targetCounts = await countTargetContent(userId);
  const targetIsEmpty = Object.values(targetCounts).every((n) => n === 0);

  return {
    manifest,
    emailMatches: manifest.sourceEmail === userEmail,
    targetIsEmpty,
    targetCounts,
  };
}

export interface ImportResult {
  counts: Record<string, number>;
  filesWritten: number;
  // Where the previous state went, so the UI can tell the user it exists.
  snapshotPath: string | null;
}

type Tx = Record<string, Record<string, (a: unknown) => Promise<unknown>>>;

async function readData(zip: JSZip): Promise<BackupData> {
  const entry = zip.file("data.json");
  if (!entry) throw new BackupError("Backup is missing data.json.");
  let raw: unknown;
  try {
    raw = JSON.parse(await entry.async("string"));
  } catch {
    throw new BackupError("data.json is not valid JSON.");
  }
  const parsed = BackupDataSchema.safeParse(raw);
  if (!parsed.success) {
    throw new BackupError(
      `Backup data failed validation: ${parsed.error.issues[0]?.path.join(".")} ${parsed.error.issues[0]?.message}`,
    );
  }
  return parsed.data;
}

// The scheduler holds a live handle to an in-flight run and a partial unique
// index enforces one per automation, so deleting it mid-flight is not a
// contention problem the "database busy" retry covers.
async function assertNoActiveRun(userId: string): Promise<void> {
  const active = await db.automationRun.findFirst({
    where: {
      status: { in: ["running", "cancelling"] },
      automation: { userId },
    },
    select: { id: true },
  });
  if (active) {
    throw new BackupError(
      "An automation run is in progress. Wait for it to finish, then import again.",
    );
  }
}

// Resolved against the target's global JobStatus table, creating any the target
// lacks from the carried label/value. Runs before the transaction: it is the
// only write outside the user's own data and it is idempotent.
async function resolveJobStatuses(
  data: BackupData,
): Promise<Map<string, string>> {
  const byValue = new Map<string, string>();
  const existing = await db.jobStatus.findMany({ select: { id: true, value: true } });
  for (const row of existing) byValue.set(row.value, row.id);

  for (const status of data.jobStatuses) {
    if (byValue.has(status.value)) continue;
    const created = await db.jobStatus.create({
      data: { label: status.label, value: status.value },
    });
    byValue.set(created.value, created.id);
  }
  return byValue;
}

// Straight inserts, no upsert. The wipe on the line above deleted every lookup
// row this user owned, so there is nothing left to resolve against — an
// "existing row" check here can never match. Replace-not-merge is the point:
// post-import counts equal the manifest for every table.
async function insertLookups(
  tx: Tx,
  data: BackupData,
  idMap: IdMap,
  userId: string,
): Promise<void> {
  for (const model of LOOKUP_MODELS) {
    const spec = MODEL_SPECS[model];
    for (const row of (data as unknown as Record<string, { id: string; value: string }[]>)[model]) {
      const newId = idMap.mint(row.id);
      const { id: _old, ...rest } = row;
      await tx[spec.delegate].create({
        data: { ...rest, id: newId, createdBy: userId },
      });
    }
  }
}

async function wipe(tx: Tx, userId: string): Promise<void> {
  // Null the back-reference first: User.defaultResumeId is a foreign key into
  // a table the wipe is about to empty.
  await tx.user.update({
    where: { id: userId },
    data: { defaultResumeId: null },
  });

  // Not restorable, but a conversation about deleted jobs is worse than a
  // clean panel. ApiKey and McpAccessToken are deliberately absent.
  await tx.chatConversation.deleteMany({ where: { userId } });

  for (const model of DELETE_ORDER) {
    const spec = MODEL_SPECS[model];
    await tx[spec.delegate].deleteMany({ where: spec.scope(userId) });
  }
}

function rowsFor(data: BackupData, model: BackupModel): Record<string, unknown>[] {
  return (data as unknown as Record<string, Record<string, unknown>[]>)[model];
}

export async function importBackup(
  bytes: Buffer,
  userId: string,
  userEmail: string,
  confirmWipe: boolean,
): Promise<ImportResult> {
  // A JWT session outlives the database it was minted against: a container
  // with a fresh dev.db still accepts the old cookie, and every scoped read
  // returns empty instead of failing. wipe()'s user.update is the only
  // statement that needs the row itself, so without this the import dies
  // mid-transaction on an opaque P2025.
  const owner = await db.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!owner) {
    throw new BackupError(
      "Your sign-in is out of date. Sign out, sign in again, then retry the import.",
    );
  }

  const zip = await openBackupZip(bytes);
  await readManifest(zip);
  const data = await readData(zip);

  const targetCounts = await countTargetContent(userId);
  const targetIsEmpty = Object.values(targetCounts).every((n) => n === 0);
  if (!targetIsEmpty && !confirmWipe) {
    throw new BackupError(
      "This account already holds data. Confirm that you want it replaced before importing.",
    );
  }

  await assertNoActiveRun(userId);

  // The safety net, and the last thing that happens before this function is
  // able to destroy anything. The transaction below protects against a crash;
  // nothing except this protects against importing the wrong file. Skipped on
  // an empty target because there is nothing to snapshot.
  let snapshotPath: string | null = null;
  if (!targetIsEmpty) {
    snapshotPath = await writeSnapshot(userId, userEmail);
  }

  const statusByValue = await resolveJobStatuses(data);

  // Mint every non-lookup id up front so the file writes below can name their
  // targets, and so a forward reference in the FK rewrite never misses.
  const idMap = new IdMap();
  for (const model of INSERT_ORDER) {
    if (MODEL_SPECS[model].lookup) continue;
    for (const row of rowsFor(data, model)) idMap.mint(row.id as string);
  }

  // Files are written before the transaction: a failed import leaves orphaned
  // bytes (unlinked below) rather than committed rows pointing at nothing.
  const writtenPaths: string[] = [];
  const uploadDir = path.join(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
  await fs.mkdir(uploadDir, { recursive: true });

  // filePath and fileType are both rebuilt here; neither is taken from the
  // payload. A row whose bytes are absent, oversized or not really a resume
  // keeps its row and loses its file — the same end state as an export whose
  // bytes had already gone missing, which the schema already models.
  const newFilePaths = new Map<string, string>();
  const newFileTypes = new Map<string, string>();
  const rejectedFiles: string[] = [];

  for (const file of data.File) {
    const newId = idMap.get(file.id)!;
    const prefix = `files/${file.id}/`;
    // A prefix scan, not `new RegExp(prefix)`: file.id comes out of the
    // payload, and interpolating it into a pattern hands an untrusted string
    // to the regex engine for no gain over startsWith.
    const entry =
      zip.file(`${prefix}${safeEntryName(file.filePath)}`) ??
      Object.keys(zip.files)
        .filter((name) => name.startsWith(prefix) && !zip.files[name].dir)
        .map((name) => zip.files[name])[0] ??
      null;

    if (!entry || file.fileMissing) {
      newFilePaths.set(file.id, importedFilePath(newId, file.filePath, "pdf"));
      continue;
    }

    const bytes = await entry.async("nodebuffer");
    const checked = checkImportedFile(bytes);
    if (!checked) {
      rejectedFiles.push(file.fileName);
      newFilePaths.set(file.id, importedFilePath(newId, file.filePath, "pdf"));
      continue;
    }

    const target = importedFilePath(newId, entry.name, checked.kind);
    newFilePaths.set(file.id, target);
    newFileTypes.set(file.id, checked.mimeType);
    await fs.writeFile(target, bytes);
    writtenPaths.push(target);
  }

  if (rejectedFiles.length > 0) {
    log.warn("[Backup] Dropped file entries that are not resumes", {
      "backup.rejected_file_count": rejectedFiles.length,
      "backup.rejected_file_names": rejectedFiles.join(", "),
    });
  }

  // Captured before the wipe so the old bytes can be unlinked after it commits.
  const oldFilePaths = (
    await db.file.findMany({
      where: MODEL_SPECS.File.scope(userId),
      select: { filePath: true },
    })
  ).map((f) => f.filePath);

  const counts: Record<string, number> = {};

  try {
    await db.$transaction(
      async (transaction) => {
        const tx = transaction as unknown as Tx;

        await wipe(tx, userId);
        await insertLookups(tx, data, idMap, userId);

        for (const model of INSERT_ORDER) {
          if (MODEL_SPECS[model].lookup) continue;
          const spec = MODEL_SPECS[model];
          const rows = rowsFor(data, model);
          counts[model] = rows.length;

          for (const row of rows) {
            let payload = buildCreateData(model, row, idMap, userId);

            if (model === "File") {
              const { fileMissing: _marker, ...rest } = payload;
              payload = {
                ...rest,
                filePath: newFilePaths.get(row.id as string)!,
                // From the sniff, never the payload. The fallback only reaches
                // rows whose bytes were absent or rejected, where the column
                // describes a file that is not on disk either way.
                fileType: newFileTypes.get(row.id as string) ?? "application/pdf",
              };
            }
            if (model === "Job") {
              const { statusValue, ...rest } = payload as { statusValue: string };
              payload = { ...rest, statusId: statusByValue.get(statusValue)! };
            }
            if (model === "Automation") {
              payload = normalizeAutomation(payload as never);
            }
            if (model === "AutomationRun") {
              payload = normalizeAutomationRun(payload as never);
            }

            await tx[spec.delegate].create({ data: payload });
          }
        }

        // Join tables last: both endpoints have to exist first.
        for (const link of data._JobToTag) {
          await tx.job.update({
            where: { id: idMap.get(link.jobId)! },
            data: { tags: { connect: { id: idMap.get(link.tagId)! } } },
          });
        }
        for (const link of data._QuestionToTag) {
          await tx.question.update({
            where: { id: idMap.get(link.questionId)! },
            data: { tags: { connect: { id: idMap.get(link.tagId)! } } },
          });
        }
        counts._JobToTag = data._JobToTag.length;
        counts._QuestionToTag = data._QuestionToTag.length;

        // A back-reference from a row the import never inserts.
        const defaultResumeId = data.user.defaultResumeId
          ? (idMap.get(data.user.defaultResumeId) ?? null)
          : null;
        await tx.user.update({ where: { id: userId }, data: { defaultResumeId } });
      },
      { timeout: 120_000, maxWait: 15_000 },
    );
  } catch (error) {
    await Promise.all(
      writtenPaths.map((p) => fs.unlink(p).catch(() => undefined)),
    );
    if (error instanceof BackupError) throw error;
    const message = error instanceof Error ? error.message : "";
    if (/database is locked|SQLITE_BUSY/i.test(message)) {
      throw new BackupError("The database is busy. Please try the import again.");
    }
    log.error("[Backup] Import transaction failed", { error: String(error) });
    throw new BackupError("Import failed and nothing was changed.");
  }

  // Without this every restore-over-existing leaves the previous account's
  // resume files in UPLOADS_DIR forever with no row pointing at them.
  for (const filePath of oldFilePaths) {
    if (writtenPaths.includes(filePath)) continue;
    await fs.unlink(filePath).catch((error) => {
      log.warn("[Backup] Could not remove replaced file", {
        "file.path": filePath,
        error: String(error),
      });
    });
  }

  // Nothing else would: syncSchedulerState runs at boot and in the automation
  // actions, and an import goes through neither. Imported dynamically so
  // node-cron and the whole scraper graph stay out of this module's imports.
  const { syncSchedulerState } = await import("@/lib/scheduler");
  await syncSchedulerState();

  return { counts, filesWritten: writtenPaths.length, snapshotPath };
}
