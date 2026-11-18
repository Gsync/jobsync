import type { JobMatchScores } from "@/models/ai.schemas";
import { runTrackedGeneration } from "@/lib/ai/trackedGeneration";
import {
  getModel,
  parseJobMatch,
  AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
  buildAutomationJobMatchPrompt,
  removeHtmlTags,
} from "@/lib/ai";
import type { JobBoard } from "@/models/automation.model";
import type { AiConfig } from "@/lib/ai/aiConfig";
import {
  inputSizeAttrs,
  log,
  SURFACES,
} from "@/lib/telemetry";
import type { JobDetails } from "../types";
import type { ResumeWithSections } from "./types";
import { convertResumeForMatch } from "./resumeText";

export type MatchResult =
  | { success: true; score: number; data: JobMatchScores & { body: string } }
  | { success: false; score: number; error: string };

export async function matchJobToResume(
  job: JobDetails,
  resume: ResumeWithSections,
  sourceBoard: JobBoard,
  ai: AiConfig,
  userId: string,
  signal?: AbortSignal,
): Promise<MatchResult> {
  try {
    const resumeText = await convertResumeForMatch(resume);
    const jobText = `
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
${job.salary ? `Salary: ${job.salary}` : ""}

Description:
${removeHtmlTags(job.description)}
`.trim();

    const model = await getModel(ai.provider, ai.modelName, userId);

    const promptText = buildAutomationJobMatchPrompt(resumeText, jobText);

    const result = await runTrackedGeneration({
      userId,
      feature: "automations",
      spanName: "scraper.match",
      surface: SURFACES.AUTOMATION_MATCH,
      ai: { ...ai, model },
      system: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
      abortSignal: signal,
      prompt: promptText,
      temperature: 0.3,
      attrs: {
        ...inputSizeAttrs({
          resumeChars: resumeText.length,
          jobChars: jobText.length,
        }),
        "jobsync.job_board": sourceBoard,
        "jobsync.user_id": userId,
      },
    });

    const { scores, body } = parseJobMatch(result.text);
    if (!scores) {
      return { success: false, score: 0, error: "No match data returned" };
    }

    return {
      success: true,
      score: scores.matchScore,
      data: {
        matchScore: scores.matchScore,
        recommendation: scores.recommendation,
        body,
      },
    };
  } catch (error) {
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      return { success: false, score: 0, error: "aborted" };
    }

    const message =
      error instanceof Error ? error.message : "AI matching failed";
    log.error("[Automation] AI matching error", { error: message });

    if (
      message.includes("ECONNREFUSED") ||
      message.includes("fetch failed") ||
      message.includes("network") ||
      message.includes("Failed to fetch") ||
      message.includes("ENOTFOUND")
    ) {
      return { success: false, score: 0, error: "ai_unavailable" };
    }

    return { success: false, score: 0, error: message };
  }
}
