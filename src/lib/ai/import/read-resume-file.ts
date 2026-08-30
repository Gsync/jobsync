import { readFile } from "fs/promises";
import path from "path";
import { APP_CONSTANTS } from "@/lib/constants";
import { extractText } from "./extract-text";

// Attached resume paths come from the database, but still stay inside the
// configured uploads directory before they are read. This keeps the runner's
// file fallback subject to the same boundary as the import route.
export async function extractAttachedResumeText(
  filePath: string | null | undefined,
): Promise<string | null> {
  if (!filePath) return null;

  const resolvedPath = path.resolve(filePath);
  const uploadsDir = path.resolve(APP_CONSTANTS.UPLOADS_DIR);
  if (
    !resolvedPath.startsWith(`${uploadsDir}${path.sep}`) &&
    resolvedPath !== uploadsDir
  ) {
    return null;
  }

  try {
    const result = await extractText(await readFile(resolvedPath));
    return result.success ? result.data.text : null;
  } catch {
    return null;
  }
}
