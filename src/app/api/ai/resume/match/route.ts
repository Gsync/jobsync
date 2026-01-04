import "server-only";

import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { streamObject } from "ai";
import { getModel } from "@/lib/ai/providers";
import { checkRateLimit } from "@/lib/ai/rate-limiter";
import {
  JobMatchSchema,
  ENHANCED_JOB_MATCH_SYSTEM_PROMPT,
  buildEnhancedJobMatchPrompt,
  calculateKeywordOverlap,
  extractKeywords,
} from "@/lib/ai";
import { convertResumeToText, convertJobToText } from "@/utils/ai.utils";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { AiModel } from "@/models/ai.model";

/**
 * Single-Agent Job Match Endpoint
 * For multi-agent collaborative analysis, use /api/ai/resume/match-collaborative
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

  const { resumeId, jobId, selectedModel } = (await req.json()) as {
    resumeId: string;
    jobId: string;
    selectedModel: AiModel;
  };

  if (!resumeId || !jobId || !selectedModel) {
    return NextResponse.json(
      { error: "Resume ID, Job ID, and model selection required" },
      { status: 400 }
    );
  }

  try {
    const [{ data: resume }, { job }] = await Promise.all([
      getResumeById(resumeId),
      getJobDetails(jobId),
    ]);

    const resumeText = await convertResumeToText(resume);
    const jobText = await convertJobToText(job);

    // Extract keyword analysis for enhanced prompting
    const keywordOverlap = calculateKeywordOverlap(resumeText, jobText);
    const resumeKeywords = extractKeywords(resumeText);
    const jobKeywords = extractKeywords(jobText);

    const basePrompt = buildEnhancedJobMatchPrompt(resumeText, jobText);
    const enhancedPrompt = `${basePrompt}

TOOL ANALYSIS RESULTS (use these in your evaluation):
- Keyword overlap: ${keywordOverlap.overlapPercentage}% (${
      keywordOverlap.matchedKeywords.length
    } of ${keywordOverlap.totalJobKeywords} job keywords found)
- Matched keywords: ${keywordOverlap.matchedKeywords.join(", ") || "none"}
- Missing keywords: ${keywordOverlap.missingKeywords.join(", ") || "none"}
- Resume has ${resumeKeywords.count} technical terms
- Job requires ${jobKeywords.count} technical terms

Use these exact counts in your Step 3 (CALCULATE POINTS) for the Keyword Overlap score.`;

    const model = getModel(
      selectedModel.provider,
      selectedModel.model || "llama3.2"
    );

    const result = streamObject({
      model,
      schema: JobMatchSchema,
      system: ENHANCED_JOB_MATCH_SYSTEM_PROMPT,
      prompt: enhancedPrompt,
      temperature: 0.3,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Job match error:", error);
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
