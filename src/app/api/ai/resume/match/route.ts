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
import {
  collaborativeJobMatch,
  validateCollaborativeOutput,
} from "@/lib/ai/multi-agent";
import { convertResumeToText, convertJobToText } from "@/utils/ai.utils";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
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
    const [resume, { job }] = await Promise.all([
      getResumeById(resumeId),
      getJobDetails(jobId),
    ]);

    const resumeText = await convertResumeToText(resume);
    const jobText = await convertJobToText(job);

    // Use query parameter to switch between modes
    const useCollaboration =
      req.nextUrl.searchParams.get("mode") === "collaborative";

    if (useCollaboration) {
      // Phase 3: Multi-Agent Collaboration Mode
      console.log("Using multi-agent collaboration for job match...");

      const { analysis, agentInsights } = await collaborativeJobMatch(
        resumeText,
        jobText,
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
        schema: JobMatchSchema,
        system:
          "You are converting a pre-analyzed result into the required schema format.",
        prompt: `Convert this multi-agent job match analysis into the required format:
        
${JSON.stringify(analysis, null, 2)}

Preserve all scores, insights, and recommendations exactly as provided by the agent team.`,
        temperature: 0.1,
      });

      return result.toTextStreamResponse();
    } else {
      // Phase 2: Enhanced Single-Agent Mode (existing implementation)
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
    }
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
