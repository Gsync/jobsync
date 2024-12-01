import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { NextApiRequest, NextApiResponse } from "next";
import {
  createResumeProfile,
  deleteFile,
  editResume,
  uploadFile,
} from "@/actions/profile.actions";
import path from "path";
import fs from "fs";
import { getTimestampedFileName } from "@/lib/utils";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;
  const dataPath = process.env.NODE_ENV !== "production" ? "data" : "/data";
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
    if (file && file.name) {
      const uploadDir = path.join(dataPath, "files", "resumes");
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

export const GET = async (req: NextRequest, res: NextApiResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;

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

    const response = new NextResponse(fileContent, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${fileName}"`,
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
