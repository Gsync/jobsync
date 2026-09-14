import fs from "fs/promises";
import path from "path";
import { APP_CONSTANTS } from "@/lib/constants";
import { getTimestampedFileName } from "@/lib/utils";
import { log } from "@/lib/telemetry";

export interface ResumeUpload {
  fileName: string;
  filePath: string;
}

// A function, not a constant: tests override UPLOADS_DIR at runtime.
// Never UPLOADS_DIR itself — it also holds the database and backups.
export function resumesDir(): string {
  return path.resolve(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
}

// The trailing separator keeps a sibling such as resumes-old from passing
export function isResumeFilePath(filePath: string): boolean {
  return path.resolve(filePath).startsWith(resumesDir() + path.sep);
}

// The path is built here and never taken from a caller
export async function saveResumeUpload(
  fileName: string,
  bytes: Uint8Array,
): Promise<ResumeUpload> {
  const dir = path.join(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, getTimestampedFileName(fileName));
  await fs.writeFile(filePath, bytes);
  return { fileName, filePath };
}

// Never throws: callers run it after a commit that must not be undone
export async function removeResumeFile(filePath: string): Promise<void> {
  if (!isResumeFilePath(filePath)) {
    log.warn("[Resume] Skipped unlinking a path outside the resumes directory", {
      "file.path": filePath,
    });
    return;
  }
  await fs.unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return;
    log.warn("[Resume] Could not remove file", {
      "file.path": filePath,
      error: String(error),
    });
  });
}
