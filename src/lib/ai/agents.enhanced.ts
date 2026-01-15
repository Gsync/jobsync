/**
 * Enhanced AI Agents with Chain-of-Thought Reasoning
 * Phase 2: Improved workflow with tool-assisted analysis
 *
 * Note: These agents are used internally by the multi-agent system.
 * The public API is through adaptiveResumeReview/adaptiveJobMatch.
 */

import { generateObject } from "ai";
import { getModel, ProviderType } from "./providers";
import { ResumeReviewSchema, JobMatchSchema } from "@/models/ai.schemas";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
} from "./prompts/prompts.enhanced";
import {
  countQuantifiedAchievements,
  extractKeywords,
  countActionVerbs,
  calculateKeywordOverlap,
  analyzeFormatting,
} from "./tools";

/**
 * Phase 2: Enhanced Resume Review Agent with Tool Use
 * Uses analysis tools for accurate counting before AI evaluation
 */
export async function enhancedResumeReviewAgent(
  resumeText: string,
  provider: ProviderType,
  modelName: string
) {
  // Phase 2: Use tools for accurate analysis
  const quantified = countQuantifiedAchievements(resumeText);
  const keywords = extractKeywords(resumeText);
  const verbs = countActionVerbs(resumeText);
  const formatting = analyzeFormatting(resumeText);

  // Enhance prompt with tool results
  const enhancedPrompt = `${buildResumeReviewPrompt(resumeText)}

TOOL ANALYSIS RESULTS (use these in your evaluation):
- Quantified achievements found: ${
    quantified.count
  } (Examples: ${quantified.examples.join(", ")})
- Technical keywords found: ${keywords.count} (${keywords.keywords
    .slice(0, 10)
    .join(", ")})
- Action verbs found: ${verbs.count} (${verbs.verbs.slice(0, 10).join(", ")})
- Formatting quality: ${
    formatting.hasBulletPoints ? "Has bullet points" : "No bullets"
  }, ${formatting.sectionCount} sections detected

Use these concrete counts in your Step 1 (SCAN & COUNT) and scoring decisions.`;

  const model = getModel(provider, modelName);

  // Get initial analysis from primary agent
  const { object: analysis } = await generateObject({
    model,
    schema: ResumeReviewSchema,
    system: RESUME_REVIEW_SYSTEM_PROMPT,
    prompt: enhancedPrompt,
    temperature: 0.3,
  });

  return analysis;
}

/**
 * Phase 2: Enhanced Job Match Agent with Tool Use
 * Uses keyword overlap calculation for accurate matching
 */
export async function enhancedJobMatchAgent(
  resumeText: string,
  jobText: string,
  provider: ProviderType,
  modelName: string
) {
  // Phase 2: Use tools for accurate keyword matching
  const keywordOverlap = calculateKeywordOverlap(resumeText, jobText);
  const resumeKeywords = extractKeywords(resumeText);
  const jobKeywords = extractKeywords(jobText);

  // Enhance prompt with tool results
  const enhancedPrompt = `${buildJobMatchPrompt(resumeText, jobText)}

TOOL ANALYSIS RESULTS (use these in your evaluation):
- Keyword overlap: ${keywordOverlap.overlapPercentage}% (${
    keywordOverlap.matchedKeywords.length
  } of ${keywordOverlap.totalJobKeywords} job keywords found)
- Matched keywords: ${keywordOverlap.matchedKeywords.join(", ")}
- Missing keywords: ${keywordOverlap.missingKeywords.join(", ")}
- Resume has ${resumeKeywords.count} technical terms
- Job requires ${jobKeywords.count} technical terms

Use these exact counts in your Step 3 (CALCULATE POINTS) for the Keyword Overlap score.`;

  const model = getModel(provider, modelName);

  // Get initial analysis from primary agent
  const { object: analysis } = await generateObject({
    model,
    schema: JobMatchSchema,
    system: JOB_MATCH_SYSTEM_PROMPT,
    prompt: enhancedPrompt,
    temperature: 0.3,
  });

  return analysis;
}

/**
 * Phase 2: Critic Agent - Validates primary agent's analysis
 * Returns validation result and suggestions for improvement
 */
export async function criticAgent(
  analysis: any,
  originalContent: string,
  provider: ProviderType,
  modelName: string
): Promise<{
  approved: boolean;
  feedback: string;
  issues?: string[];
}> {
  const model = getModel(provider, modelName);

  const analysisText = JSON.stringify(analysis, null, 2);

  const { generateText } = await import("ai");
  const { buildCriticPrompt } = await import("./prompts/prompts.enhanced");
  const { CRITIC_SYSTEM_PROMPT } = await import("./prompts/prompts.enhanced");

  const { text: criticFeedback } = await generateText({
    model,
    system: CRITIC_SYSTEM_PROMPT,
    prompt: buildCriticPrompt(analysisText, originalContent),
    temperature: 0.1,
  });

  const approved = criticFeedback.includes("APPROVED");
  const issues = approved
    ? []
    : criticFeedback
        .split("\n")
        .filter((line) => line.trim().startsWith("-"))
        .map((line) => line.trim().substring(1).trim());

  return {
    approved,
    feedback: criticFeedback,
    issues,
  };
}
