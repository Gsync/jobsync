import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { NextApiRequest, NextApiResponse } from "next";
import { createResumeProfile } from "@/actions/profile.actions";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";
import { getTimestampedFileName } from "@/lib/utils";

export const POST = async (req: NextRequest, res: NextApiResponse) => {
  const session = await auth();
  const userId = session?.accessToken.sub;
  let filePath;

  try {
    if (!session || !session.user) {
      return res.status(401).json({ message: "Not Authenticated" });
    }
    const formData = await req.formData();
    const title = formData.get("title") as string;
    const file = formData.get("file") as File;

    if (file && file.name) {
      const bytes = await file.arrayBuffer();
      const buffer = new Uint8Array(bytes);

      const uploadDir = path.join("data", "files", "resumes");

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
    return NextResponse.json(
      {
        error: "File upload failed",
      },
      {
        status: 500,
      }
    );
  }
};
