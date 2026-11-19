import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { log } from "@/lib/telemetry";
import { saveAttachmentUpload, isAttachmentFilePath } from "@/lib/resumeFiles";

const ALLOWED_MIME = new Set<string>([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "image/png",
  "image/jpeg",
]);

export const POST = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  const { id: jobId } = await params;
  try {
    if (!session || !session.user || !userId) {
      return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
    }
    const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file || !file.name || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > APP_CONSTANTS.MAX_RESUME_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File too large" }, { status: 400 });
    }
    if (!ALLOWED_MIME.has(file.type)) {
      return NextResponse.json({ error: "Unsupported file type" }, { status: 400 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const upload = await saveAttachmentUpload(file.name, bytes);
    const created = await prisma.file.create({
      data: {
        fileName: file.name,
        filePath: upload.filePath,
        fileType: file.type,
        Job: { connect: { id: jobId } },
      },
    });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    log.error("[JobAttachment] Upload failed", { error: String(error) });
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
};

export const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const session = await auth();
  const userId = session?.user?.id;
  const { id: jobId } = await params;
  try {
    if (!session || !session.user || !userId) {
      return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
    }
    const job = await prisma.job.findFirst({ where: { id: jobId, userId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const files = await prisma.file.findMany({ where: { jobId } });
    return NextResponse.json({ success: true, data: files });
  } catch (error) {
    return NextResponse.json({ error: "Failed to list" }, { status: 500 });
  }
};