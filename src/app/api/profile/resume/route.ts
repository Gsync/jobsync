import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { editResume } from "@/actions/profile.actions";
import {
  createResume,
  replaceResumeFile,
} from "@/actions/profile/resumeUpload";
import path from "path";
import fs from "fs";
import { APP_CONSTANTS } from "@/lib/constants";
import { PDF_MAGIC, ZIP_MAGIC } from "@/lib/ai/import/extract-text";
import { log } from "@/lib/telemetry";
import prisma from "@/lib/db";
import {
  isResumeFilePath,
  saveResumeUpload,
  type ResumeUpload,
} from "@/lib/resumeFiles";

const ALLOWED_MIME = new Set<string>(APP_CONSTANTS.RESUME_ALLOWED_MIME_TYPES);

function validateFileBytes(buf: Buffer, mimeType: string): boolean {
  if (mimeType === "application/pdf") return buf.subarray(0, 4).equals(PDF_MAGIC);
  if (mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return buf.subarray(0, 4).equals(ZIP_MAGIC);
  }
  return false;
}

export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    if (!session || !session.user) {
      return NextResponse.json(
        {
          error: "Not Authenticated",
        },
        {
          status: 401,
        }
      );
    }
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;
    const resumeId = (formData.get("id") as string) ?? null;
    // fileId is not read: the replaced file comes from the owned resume row
    let upload: ResumeUpload | undefined;

    if (file && file.name && file.size > 0) {
      // Server-side validation: size, MIME type, and magic bytes
      if (file.size > APP_CONSTANTS.MAX_RESUME_FILE_SIZE_BYTES) {
        return NextResponse.json({ error: "File size must be less than 5MB" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json({ error: "Only PDF and .docx files are supported" }, { status: 400 });
      }
      const fileBytes = Buffer.from(await file.arrayBuffer());
      if (!validateFileBytes(fileBytes, file.type)) {
        return NextResponse.json({ error: "File content does not match declared type" }, { status: 400 });
      }

      upload = await saveResumeUpload(file.name, fileBytes);
    }

    if (resumeId && title) {
      const res = upload
        ? await replaceResumeFile(resumeId, title, upload)
        : await editResume(resumeId, title);
      return NextResponse.json(res, { status: 200 });
    }

    const response = await createResume(title, upload);
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    log.error("[Resume] Upload failed", { error: String(error) });
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message ?? "Resume update or File upload failed",
        },
        {
          status: 500,
        }
      );
    }
  }
};

export const GET = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;

  try {
    if (!session || !session.user || !userId) {
      return NextResponse.json(
        {
          error: "Not Authenticated",
        },
        {
          status: 401,
        }
      );
    }

    const { searchParams } = new URL(req.url);
    const resumeId = searchParams.get("resumeId");

    if (!resumeId) {
      return NextResponse.json(
        { error: "Resume id is required" },
        { status: 400 }
      );
    }

    // The path comes from the caller's own resume row, never from the client
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId } },
      select: { File: { select: { filePath: true } } },
    });

    const storedPath = resume?.File?.filePath;
    if (
      !storedPath ||
      !isResumeFilePath(storedPath) ||
      !fs.existsSync(path.resolve(storedPath))
    ) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }
    const fullFilePath = path.resolve(storedPath);

    const fileType = path.extname(fullFilePath).toLowerCase();
    const fileName = path.basename(fullFilePath);

    let contentType;

    if (fileType === ".pdf") {
      contentType = "application/pdf";
    } else if (fileType === ".doc" || fileType === ".docx") {
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else {
      return NextResponse.json(
        { error: "Unsupported file type" },
        { status: 400 }
      );
    }

    const fileContent = fs.readFileSync(fullFilePath);

    // Strip CR/LF from filename to prevent header injection
    const safeFileName = fileName.replace(/[\r\n"]/g, "_");
    const response = new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
      },
    });

    return response;
  } catch (error) {
    log.error("[Resume] File download failed", { error: String(error) });
    if (error instanceof Error) {
      return NextResponse.json(
        {
          error: error.message ?? "File download failed",
        },
        {
          status: 500,
        }
      );
    }
  }
};
