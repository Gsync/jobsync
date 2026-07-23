import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { TEMPERATURES } from "@/lib/ai/config";
import {
  COVER_LETTER_SYSTEM_PROMPT,
  buildCoverLetterPrompt,
  AIUnavailableError,
  preprocessResume,
  preprocessJob,
} from "@/lib/ai";
import { extractMatchGuidance } from "@/lib/ai/coverLetter/matchGuidance";
import { APP_CONSTANTS } from "@/lib/constants";
import { getResumeById, getDefaultResumeId } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { AiModel } from "@/models/ai.model";

/**
 * Cover Letter Endpoint
 * Streams a plain markdown letter. No scores line, no structured output.
 */
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
        error: `Rate limit exceeded. Try again in ${Math.ceil(
          rateLimit.resetIn / 1000,
        )} seconds.`,
      },
      { status: 429 },
    );
  }

  const { jobId, resumeId, selectedModel } = (await req.json()) as {
    jobId: string;
    resumeId?: string;
    selectedModel: AiModel;
  };

  if (!jobId || !selectedModel) {
    return NextResponse.json(
      { error: "Job ID and model selection required" },
      { status: 400 },
    );
  }

  try {
    // Ownership-scoped: a forged jobId yields no job rather than another
    // user's job.
    const { job } = await getJobDetails(jobId);

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    if (job.descriptionCompleteness === "title-only") {
      return NextResponse.json(
        {
          error:
            "This job has no real description yet. Add one before generating a letter.",
        },
        { status: 400 },
      );
    }

    // Explicit pick wins, then the job's own resume, then the user default.
    const effectiveResumeId =
      resumeId ?? job.resumeId ?? (await getDefaultResumeId());

    if (!effectiveResumeId) {
      return NextResponse.json(
        { error: "Select a resume to generate a cover letter." },
        { status: 400 },
      );
    }

    // Ownership-scoped, so a forged resumeId yields nothing rather than
    // another user's resume.
    const { data: resume } = await getResumeById(effectiveResumeId);

    if (!resume) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    const [resumePreprocessResult, jobPreprocessResult] = await Promise.all([
      preprocessResume(resume),
      preprocessJob(job),
    ]);

    if (!resumePreprocessResult.success) {
      return NextResponse.json(
        {
          error: resumePreprocessResult.error.message,
          code: resumePreprocessResult.error.code,
        },
        { status: 400 },
      );
    }

    if (!jobPreprocessResult.success) {
      return NextResponse.json(
        {
          error: jobPreprocessResult.error.message,
          code: jobPreprocessResult.error.code,
        },
        { status: 400 },
      );
    }

    const { normalizedText: resumeText } = resumePreprocessResult.data;
    const { normalizedText: jobText } = jobPreprocessResult.data;
    const guidance = extractMatchGuidance(job.matchData);

    const model = await getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2",
      userId,
    );

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      APP_CONSTANTS.AI_COVER_LETTER_TIMEOUT_MS,
    );

    const result = streamText({
      model,
      system: COVER_LETTER_SYSTEM_PROMPT,
      prompt: buildCoverLetterPrompt(resumeText, jobText, guidance),
      temperature: TEMPERATURES.FEEDBACK,
      abortSignal: controller.signal,
      providerOptions: {
        ollama: { options: { num_ctx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX } },
      },
      onFinish: () => {
        clearTimeout(timer);
      },
      onError: ({ error }) => {
        clearTimeout(timer);
        console.error("Cover letter stream error:", error);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Cover letter error:", error);

    if (error instanceof AIUnavailableError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    const message =
      error instanceof Error ? error.message : "AI request failed";

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error: `Cannot connect to ${selectedModel.provider} service. Please ensure the service is running.`,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
};
