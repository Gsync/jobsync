import path from "path";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";

export type OwnedResumeFile = {
  filePath: string;
  fileName: string;
};

export function isPathInsideUploads(filePath: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const uploadsRoot = path.resolve(APP_CONSTANTS.UPLOADS_DIR);
  return (
    resolvedPath === uploadsRoot ||
    resolvedPath.startsWith(uploadsRoot + path.sep)
  );
}

export async function getOwnedResumeFile(
  userId: string,
  resumeId: string,
): Promise<OwnedResumeFile | null> {
  const resume = await prisma.resume.findFirst({
    where: {
      id: resumeId,
      profile: { userId },
    },
    select: {
      File: {
        select: {
          filePath: true,
          fileName: true,
        },
      },
    },
  });

  const file = resume?.File;
  if (!file?.filePath || !file.fileName || !isPathInsideUploads(file.filePath)) {
    return null;
  }
  return { filePath: file.filePath, fileName: file.fileName };
}
