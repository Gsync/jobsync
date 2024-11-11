import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { NextApiRequest, NextApiResponse } from "next";
import { createResumeProfile } from "@/actions/profile.actions";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { getTimestampedFileName } from "@/lib/utils";

export const POST = async (req: NextRequest, res: NextResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;
  let filePath;

  // try using same endpoint to edit, use id and fileid to update

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

    if (file && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);

      const dataPath = process.env.NODE_ENV !== "production" ? "data" : "/data";

      const uploadDir = path.join(dataPath, "files", "resumes");

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const timestampedFileName = getTimestampedFileName(file.name);

      filePath = path.join(uploadDir, timestampedFileName);

      await writeFile(filePath, buffer);
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
          error: error.message ?? "File upload failed",
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
