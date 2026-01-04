import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { streamObject } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  ResumeReviewSchema,
  ENHANCED_RESUME_REVIEW_SYSTEM_PROMPT,
  buildEnhancedResumeReviewPrompt,
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  analyzeFormatting,
} from "@/lib/ai";
import { convertResumeToText } from "@/utils/ai.utils";
import { Resume } from "@/models/profile.model";
import { AiModel } from "@/models/ai.model";

/**
 * Single-Agent Resume Review Endpoint
 * For multi-agent collaborative analysis, use /api/ai/resume/review-collaborative
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
          rateLimit.resetIn / 1000
        )} seconds.`,
      },
      { status: 429 }
    );
  }

  const { selectedModel, resume } = (await req.json()) as {
    selectedModel: AiModel;
    resume: Resume;
  };

  if (!resume || !selectedModel) {
    return NextResponse.json(
      { error: "Resume and model selection required" },
      { status: 400 }
    );
  }

  try {
    const resumeText = await convertResumeToText(resume);

    // Extract tool data for enhanced prompting
    const quantified = countQuantifiedAchievements(resumeText);
    const keywords = extractKeywords(resumeText);
    const verbs = countActionVerbs(resumeText);
    const formatting = analyzeFormatting(resumeText);

    const basePrompt = buildEnhancedResumeReviewPrompt(resumeText);
    const enhancedPrompt = `${basePrompt}

TOOL ANALYSIS RESULTS (use these in your evaluation):
- Quantified achievements found: ${quantified.count} (Examples: ${
      quantified.examples.join(", ") || "none"
    })
- Technical keywords found: ${keywords.count} (${
      keywords.keywords.slice(0, 10).join(", ") || "none"
    })
- Action verbs found: ${verbs.count} (${
      verbs.verbs.slice(0, 10).join(", ") || "none"
    })
- Formatting quality: ${
      formatting.hasBulletPoints ? "Has bullet points" : "No bullets"
    }, ${formatting.sectionCount} sections detected

Use these concrete counts in your Step 1 (SCAN & COUNT) and scoring decisions.`;

    const model = getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2"
    );

    const result = streamObject({
      model,
      schema: ResumeReviewSchema,
      system: ENHANCED_RESUME_REVIEW_SYSTEM_PROMPT,
      prompt: enhancedPrompt,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Resume review error:", error);
    const message =
      error instanceof Error ? error.message : "AI request failed";

    if (message.includes("fetch failed") || message.includes("ECONNREFUSED")) {
      return NextResponse.json(
        {
          error: `Cannot connect to ${selectedModel.provider} service. Please ensure the service is running.`,
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
};
