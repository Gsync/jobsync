import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import path from "path";
import fs from "fs";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { TEMPERATURES } from "@/lib/ai/config";
import { preprocessText } from "@/lib/ai";
import { extractText } from "@/lib/ai/import/extract-text";
import { ResumeImportSchema } from "@/models/resumeImport.schema";
import { AiModel } from "@/models/ai.model";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  RESUME_IMPORT_SYSTEM_PROMPT,
  buildResumeImportPrompt,
} from "@/lib/ai/prompts/resume-import";

export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(userId);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: `Rate limit exceeded. Try again in ${Math.ceil(rateLimit.resetIn / 1000)} seconds.`,
      },
      { status: 429 },
    );
  }

  let body: { resumeId: string; selectedModel: AiModel };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { resumeId, selectedModel } = body;

  if (!resumeId || !selectedModel) {
    return NextResponse.json(
      { error: "resumeId and selectedModel are required" },
      { status: 400 },
    );
  }

  // Look up the file scoped to this user — never trust client-supplied paths
  const resume = await prisma.resume.findUnique({
    where: { id: resumeId, profile: { userId } },
    select: { File: { select: { filePath: true } } },
  });

  if (!resume?.File?.filePath) {
    return NextResponse.json(
      { error: "No file attached to this resume. Please re-attach the file." },
      { status: 400 },
    );
  }

  // Assert path stays inside the uploads dir (no traversal)
  const resolvedPath = path.resolve(resume.File.filePath);
  const uploadsDir = path.resolve(APP_CONSTANTS.UPLOADS_DIR);
  if (!resolvedPath.startsWith(uploadsDir + path.sep) && resolvedPath !== uploadsDir) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  if (!fs.existsSync(resolvedPath)) {
    return NextResponse.json(
      { error: "File not found on disk. Please re-attach the file." },
      { status: 400 },
    );
  }

  const buf = fs.readFileSync(resolvedPath);

  const extractResult = await extractText(buf);
  if (!extractResult.success) {
    return NextResponse.json(
      { error: extractResult.error.message, code: extractResult.error.code },
      { status: 422 },
    );
  }

  const { text, truncated } = extractResult.data;

  const preprocessResult = await preprocessText(text);
  if (!preprocessResult.success) {
    return NextResponse.json(
      { error: preprocessResult.error.message, code: preprocessResult.error.code },
      { status: 422 },
    );
  }

  try {
    const model = await getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2",
      userId,
    );

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90_000);

    let output;
    try {
      ({ output } = await generateText({
        model,
        output: Output.object({ schema: ResumeImportSchema }),
        system: RESUME_IMPORT_SYSTEM_PROMPT,
        prompt: buildResumeImportPrompt(preprocessResult.data.normalizedText),
        temperature: TEMPERATURES.ANALYSIS,
        abortSignal: controller.signal,
        providerOptions: {
          ollama: { options: { num_ctx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX } },
        },
      }));
    } finally {
      clearTimeout(timer);
    }

    return NextResponse.json({ success: true, data: output, truncated }, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "AI request timed out after 90 seconds. Please try again." },
        { status: 504 },
      );
    }

    const message = error instanceof Error ? error.message : "AI request failed";

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: `Cannot connect to AI service. Please ensure the service is running.` },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
};
