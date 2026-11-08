"use server";
import prisma from "@/lib/db";
import fs from "fs";
import { isResumeFilePath, isAttachmentFilePath } from "@/lib/resumeFiles";
import { log } from "@/lib/telemetry";
import { requireUser } from "./shared";

export const deleteFile = async (fileId: string) => {
  const user = await requireUser();

  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      OR: [
        { Resume: { profile: { userId: user.id } } },
        { Job: { userId: user.id } },
      ],
    },
  });

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
