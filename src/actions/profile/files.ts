"use server";
import prisma from "@/lib/db";
import fs from "fs";
import { isResumeFilePath, isAttachmentFilePath } from "@/lib/resumeFiles";
import { log } from "@/lib/telemetry";
import { requireUser } from "./shared";

export const deleteFile = async (fileId: string) => {
  const user = await requireUser();

  // Two owner-scoped lookups rather than an OR: an OR hides which relation
  // granted access, and the ownership guard cannot verify it.
  const file =
    (await prisma.file.findFirst({
      where: {
        id: fileId,
        Resume: { profile: { userId: user.id } },
      },
    })) ??
    (await prisma.file.findFirst({
      where: {
        id: fileId,
        Job: { userId: user.id },
      },
    }));

  if (!file) {
    throw new Error("File not found or access denied");
  }

  const isManaged =
    isResumeFilePath(file.filePath) || isAttachmentFilePath(file.filePath);
  if (!isManaged) {
    log.warn("[File] Skipped unlinking a path outside managed directories", {
      "file.path": file.filePath,
    });
  } else if (fs.existsSync(file.filePath)) {
    fs.unlinkSync(file.filePath);
  }

  await prisma.file.delete({ where: { id: fileId } });
};
