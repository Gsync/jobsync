import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import {
  createResumeProfile,
  deleteFile,
  editResume,
  uploadFile,
} from "@/actions/profile.actions";
import path from "path";
import fs from "fs";
import { getTimestampedFileName } from "@/lib/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { PDF_MAGIC, ZIP_MAGIC } from "@/lib/ai/import/extract-text";

const ALLOWED_MIME = new Set(APP_CONSTANTS.RESUME_ALLOWED_MIME_TYPES);

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
  let filePath;

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
    let fileId: string | undefined =
      (formData.get("fileId") as string) ?? undefined;

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

      const uploadDir = path.join(APP_CONSTANTS.UPLOADS_DIR, "files", "resumes");
      const timestampedFileName = getTimestampedFileName(file.name);
      filePath = path.join(uploadDir, timestampedFileName);
      await uploadFile(file, uploadDir, filePath);
    }

    if (resumeId && title) {
      if (fileId && file?.name) {
        await deleteFile(fileId);
        fileId = undefined;
      }

      const res = await editResume(
        resumeId,
        title,
        fileId,
        file?.name,
        filePath
      );
      return NextResponse.json(res, { status: 200 });
    }

    const response = await createResumeProfile(
      title,
      file.name ?? null,
      filePath
    );
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error(error);
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

    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    const fullFilePath = path.join(filePath);
    if (!fs.existsSync(fullFilePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

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
    console.error(error);
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
