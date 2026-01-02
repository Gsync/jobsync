import { generateObject } from "ai";
import { getModel, ProviderType } from "./providers";
import { ResumeReviewSchema, JobMatchSchema } from "./schemas";
import {
  RESUME_REVIEW_SYSTEM_PROMPT,
  JOB_MATCH_SYSTEM_PROMPT,
  buildResumeReviewPrompt,
  buildJobMatchPrompt,
} from "./prompts";

/**
 * Resume review agent - analyzes resume and returns structured feedback.
 * Uses generateObject for reliable structured output.
 */
export async function reviewResumeAgent(
  resumeText: string,
  provider: ProviderType,
  modelName: string
) {
  const model = getModel(provider, modelName);

  const { object } = await generateObject({
    model,
    schema: ResumeReviewSchema,
    system: RESUME_REVIEW_SYSTEM_PROMPT,
    prompt: buildResumeReviewPrompt(resumeText),
    temperature: 0,
  });

  return object;
}

/**
 * Job match agent - compares resume to job description.
 * Uses generateObject for reliable structured output.
 */
export async function matchJobAgent(
  resumeText: string,
  jobText: string,
  provider: ProviderType,
  modelName: string
) {
  const model = getModel(provider, modelName);

  const { object } = await generateObject({
    model,
    schema: JobMatchSchema,
    system: JOB_MATCH_SYSTEM_PROMPT,
    prompt: buildJobMatchPrompt(resumeText, jobText),
    temperature: 0,
  });

  return object;
}
