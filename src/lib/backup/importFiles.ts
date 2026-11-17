import fs from "fs/promises";
import path from "path";
import type JSZip from "jszip";
import { APP_CONSTANTS } from "@/lib/constants";
import { log } from "@/lib/telemetry";
import { isResumeFilePath } from "@/lib/resumeFiles";
import type { IdMap } from "./idmap";
import {
  checkImportedFile,
  importedFilePath,
  safeEntryName,
} from "./normalize";
import type { BackupData } from "./schema";

export interface WrittenFiles {
  writtenPaths: string[];
  newFilePaths: Map<string, string>;
  newFileTypes: Map<string, string>;
}

// Files are written before the transaction: a failed import leaves orphaned
// bytes (unlinked by the caller) rather than committed rows pointing at nothing.
export async function writeImportedFiles(
  zip: JSZip,
  data: BackupData,
  idMap: IdMap,
): Promise<WrittenFiles> {
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

  return { writtenPaths, newFilePaths, newFileTypes };
}

// Without this every restore-over-existing leaves the previous account's
// resume files in UPLOADS_DIR forever with no row pointing at them.
export async function removeReplacedFiles(
  oldFilePaths: string[],
  writtenPaths: string[],
): Promise<void> {
  for (const filePath of oldFilePaths) {
    if (writtenPaths.includes(filePath)) continue;
    if (!isResumeFilePath(filePath)) {
      log.warn("[Backup] Skipped removing a file outside the resumes directory", {
        "file.path": filePath,
      });
      continue;
    }
    await fs.unlink(filePath).catch((error) => {
      log.warn("[Backup] Could not remove replaced file", {
        "file.path": filePath,
        error: String(error),
      });
    });
  }
}
