import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { streamText, Output } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  ResumeReviewSchema,
  RESUME_REVIEW_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  extractSemanticKeywords,
  analyzeActionVerbs,
  getKeywordCountFromSemantic,
  getVerbCountFromSemantic,
  AIUnavailableError,
  preprocessResume,
} from "@/lib/ai";
import { Resume } from "@/models/profile.model";
import { AiModel } from "@/models/ai.model";

/**
 * Resume Review Endpoint
 */
export const POST = async (req: NextRequest) => {
  const session = await auth();
  const userId = session?.accessToken?.sub;

  if (!session || !session.user || !userId) {
    return NextResponse.json({ message: "Not Authenticated" }, { status: 401 });
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

  const { selectedModel, resume } = (await req.json()) as {
    selectedModel: AiModel;
    resume: Resume;
  };

  if (!resume || !selectedModel) {
    return NextResponse.json(
      { error: "Resume and model selection required" },
      { status: 400 },
    );
  }

  try {
    const preprocessResult = await preprocessResume(resume);
    if (!preprocessResult.success) {
      return NextResponse.json(
        { error: preprocessResult.error.message, code: preprocessResult.error.code },
        { status: 400 },
      );
    }
    const { normalizedText, metadata } = preprocessResult.data;

    // Use semantic extraction for keywords and verbs
    const [semanticKeywords, semanticVerbs] = await Promise.all([
      extractSemanticKeywords(
        normalizedText,
        selectedModel.provider,
        selectedModel.model || "llama3.2",
      ),
      analyzeActionVerbs(
        normalizedText,
        selectedModel.provider,
        selectedModel.model || "llama3.2",
      ),
    ]);

    const keywordCount = getKeywordCountFromSemantic(semanticKeywords);
    const verbCount = getVerbCountFromSemantic(semanticVerbs);
    const allKeywords = [
      ...semanticKeywords.technical_skills,
      ...semanticKeywords.tools_platforms,
    ];
    const allVerbs = semanticVerbs.strong_verbs.map((v) => v.verb);

    const basePrompt = buildResumeReviewPrompt(normalizedText);
    const fullPrompt = `${basePrompt}

TOOL ANALYSIS RESULTS (use these in your evaluation):
- Technical keywords found: ${keywordCount} (${allKeywords.slice(0, 10).join(", ") || "none"})
- Action verbs found: ${verbCount} (${allVerbs.slice(0, 10).join(", ") || "none"})

Use these concrete counts in your Step 1 (SCAN & COUNT) and scoring decisions.`;

    const model = getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2",
    );

    const result = streamText({
      model,
      output: Output.object({
        schema: ResumeReviewSchema,
      }),
      system: RESUME_REVIEW_SYSTEM_PROMPT,
      prompt: fullPrompt,
      temperature: 0.3,
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
