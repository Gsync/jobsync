import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { streamText } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import { TEMPERATURES } from "@/lib/ai/config";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  AIUnavailableError,
  preprocessResume,
} from "@/lib/ai";
import { APP_CONSTANTS } from "@/lib/constants";
import { getResumeById } from "@/actions/profile.actions";
import { AiModel } from "@/models/ai.model";

/**
 * Resume Review Endpoint
 * Single comprehensive LLM call for complete resume analysis
 */
export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.user?.id;

  if (!session || !userId) {
    return NextResponse.json({ error: "Not Authenticated" }, { status: 401 });
  }

  // Rate limiting
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

  const { selectedModel, resumeId } = (await req.json()) as {
    selectedModel: AiModel;
    resumeId: string;
  };

  if (!resumeId || !selectedModel) {
    return NextResponse.json(
      { error: "resumeId and model selection required" },
      { status: 400 },
    );
  }

  // Load the resume server-side, scoped to the caller (ownership check) — never
  // trust resume content sent by the client.
  const resumeResult = await getResumeById(resumeId);
  if (!resumeResult?.success || !resumeResult.data) {
    return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  try {
    const preprocessResult = await preprocessResume(resumeResult.data);
    if (!preprocessResult.success) {
      return NextResponse.json(
        {
          error: preprocessResult.error.message,
          code: preprocessResult.error.code,
        },
        { status: 400 },
      );
    }
    const { normalizedText } = preprocessResult.data;

    const model = await getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2",
      userId,
    );

    const controller = new AbortController();
    const timer = setTimeout(
      () => controller.abort(),
      APP_CONSTANTS.AI_RESUME_REVIEW_TIMEOUT_MS,
    );

    // Free-form markdown output (scores line + markdown body). Plain text means
    // toTextStreamResponse() is correct here — no structured-output parsing, so
    // none of the json/tool-call empty-textStream pitfalls apply.
    const result = streamText({
      model,
      system: RESUME_REVIEW_SYSTEM_PROMPT,
      prompt: buildResumeReviewPrompt(normalizedText),
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
        console.error("Resume review stream error:", error);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Resume review error:", error);

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
