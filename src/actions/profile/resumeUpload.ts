import path from "path";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { log } from "@/lib/telemetry";
import { removeResumeFile, type ResumeUpload } from "@/lib/resumeFiles";
import { createFileEntry, requireUser } from "./shared";

// Not a "use server" module: these take a server-built file path, so they
// must never be browser-callable. Only the upload route and resume.ts import
// them — never re-export them from profile.actions.ts.

export const createResume = async (
  title: string,
  upload?: ResumeUpload,
): Promise<any | undefined> => {
  // Once a resume row references the upload, a failure must keep its bytes
  let fileLinked = false;
  try {
    const user = await requireUser();

    // Build a unique title: if base title is taken, append (2), (3), …
    const existingTitles = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });
    const taken = new Set(existingTitles.map((r) => r.title.toLowerCase()));
    const base = title.trim();
    let uniqueTitle = base;
    let counter = 2;
    while (taken.has(uniqueTitle.toLowerCase())) {
      uniqueTitle = `${base} (${counter++})`;
    }

    // Count before creating so we can auto-default the user's first resume.
    const resumeCount = await prisma.resume.count({
      where: { profile: { userId: user.id } },
    });

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    let res: any;
    let createdResumeId: string;
    if (profile && profile.id) {
      res = await prisma.resume.create({
        data: {
          profileId: profile!.id,
          title: uniqueTitle,
          FileId: upload
            ? await createFileEntry(upload.fileName, upload.filePath)
            : null,
        },
      });
      createdResumeId = res.id;
    } else {
      // No profile yet: profile.create returns the profile, so pull the
      // created resume's id from the nested include.
      res = await prisma.profile.create({
        data: {
          userId: user.id,
          resumes: {
            create: [
              {
                title: uniqueTitle,
                FileId: upload
                  ? await createFileEntry(upload.fileName, upload.filePath)
                  : null,
              },
            ],
          },
        },
        include: { resumes: { select: { id: true } } },
      });
      createdResumeId = res.resumes[0].id;
    }
    fileLinked = true;

    // Auto-default only the user's very first resume (decision #4/#5).
    if (resumeCount === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultResumeId: createdResumeId },
      });
    }
    return { success: true, data: res };
  } catch (error) {
    if (upload && !fileLinked) await removeResumeFile(upload.filePath);
    const msg = "Failed to create resume.";
    return handleError(error, msg);
  }
};

export const replaceResumeFile = async (
  resumeId: string,
  title: string,
  upload: ResumeUpload,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    // The file being replaced comes from the owned row, never from the form
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { File: { select: { id: true, filePath: true } } },
    });
    if (!resume) {
      throw new Error("Resume not found or access denied");
    }

    const res = await prisma.$transaction(async (tx) => {
      const fileId = await createFileEntry(
        upload.fileName,
        upload.filePath,
        tx,
      );
      return tx.resume.update({
        where: { id: resumeId, profile: { userId: user.id } },
        data: { title, FileId: fileId },
      });
    });

    if (resume.File) await removeReplacedFile(resume.File, upload.filePath);
    return { success: true, data: res };
  } catch (error) {
    await removeResumeFile(upload.filePath);
    const msg = "Failed to update resume or file.";
    return handleError(error, msg);
  }
};

// Never throws: the swap has committed, and replaceResumeFile's catch would
// otherwise unlink the bytes the resume now points at. Not deleteFile — its
// ownership chain ran through the resume that no longer references this row.
const removeReplacedFile = async (
  file: { id: string; filePath: string },
  newFilePath: string,
) => {
  try {
    await prisma.file.delete({ where: { id: file.id } });
  } catch (error) {
    log.warn("[Resume] Could not delete replaced file row", {
      "file.id": file.id,
      error: String(error),
    });
    return;
  }
  // Same-second uploads of one name share a path; that path is now the new file
  if (path.resolve(file.filePath) === path.resolve(newFilePath)) return;
  await removeResumeFile(file.filePath);
};
