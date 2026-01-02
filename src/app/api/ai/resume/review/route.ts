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
import {
  collaborativeResumeReview,
  validateCollaborativeOutput,
} from "@/lib/ai/multi-agent";
import { convertResumeToText } from "@/utils/ai.utils";
import { Resume } from "@/models/profile.model";
import { AiModel } from "@/models/ai.model";

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

    // Use query parameter to switch between modes
    const useCollaboration =
      req.nextUrl.searchParams.get("mode") === "collaborative";

    if (useCollaboration) {
      // Phase 3: Multi-Agent Collaboration Mode
      console.log("Using multi-agent collaboration...");

      const { analysis, agentInsights } = await collaborativeResumeReview(
        resumeText,
        selectedModel.provider,
        selectedModel.model || "llama3.2"
      );

      // Optional: Validate output quality
      const validation = await validateCollaborativeOutput(
        analysis,
        agentInsights,
        selectedModel.provider,
        selectedModel.model || "llama3.2"
      );

      if (!validation.valid) {
        console.warn("Validation issues:", validation.issues);
      }

      // Return the collaborative analysis as streaming response
      const model = getModel(
        selectedModel.provider,
        selectedModel.model || "llama3.2"
      );

      const result = streamObject({
        model,
        schema: ResumeReviewSchema,
        system:
          "You are converting a pre-analyzed result into the required schema format.",
        prompt: `Convert this multi-agent analysis into the required format:
        
${JSON.stringify(analysis, null, 2)}

Preserve all scores, suggestions, and insights exactly as provided by the agent team.`,
        temperature: 0.1,
      });

      return result.toTextStreamResponse();
    } else {
      // Phase 2: Enhanced Single-Agent Mode (existing implementation)
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
    }
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
