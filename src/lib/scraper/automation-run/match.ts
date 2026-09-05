import { generateText } from "ai";
import {
  getModel,
  parseJobMatch,
  AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
  buildAutomationJobMatchPrompt,
  removeHtmlTags,
} from "@/lib/ai";
import { APP_CONSTANTS } from "@/lib/constants";
import type { JobBoard } from "@/models/automation.model";
import type { AiSettings } from "@/models/userSettings.model";
import {
  genAiRequestAttrs,
  genAiResponseAttrs,
  inputSizeAttrs,
  log,
  SURFACES,
  withSpan,
} from "@/lib/telemetry";
import type { JobDetails } from "../types";
import type { ResumeWithSections } from "./types";
import { getDefaultModelForProvider } from "./aiSettings";
import { convertResumeForMatch } from "./resumeText";

export interface MatchResult {
  success: boolean;
  score: number;
  data?: object;
  error?: string;
}

export async function matchJobToResume(
  job: JobDetails,
  resume: ResumeWithSections,
  sourceBoard: JobBoard,
  aiSettings: AiSettings,
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

    const provider = aiSettings.provider;
    const modelName = aiSettings.model || getDefaultModelForProvider(provider);
    const model = await getModel(provider, modelName, userId);

    const promptText = buildAutomationJobMatchPrompt(resumeText, jobText);

    const result = await withSpan(
      "scraper.match",
      {
        ...genAiRequestAttrs({
          provider,
          model: modelName,
          temperature: 0.3,
          numCtx: APP_CONSTANTS.AI_OLLAMA_NUM_CTX,
          surface: SURFACES.AUTOMATION_MATCH,
          system: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
          prompt: promptText,
        }),
        ...inputSizeAttrs({
          resumeChars: resumeText.length,
          jobChars: jobText.length,
        }),
        "jobsync.job_board": sourceBoard,
        "jobsync.user_id": userId,
      },
      async (span) => {
        const generated = await generateText({
          model,
          system: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
          prompt: promptText,
          temperature: 0.3,
          abortSignal: signal,
        });
        span.setAttrs(
          genAiResponseAttrs({
            usage: generated.totalUsage,
            finishReason: generated.finishReason,
            text: generated.text,
          }),
        );
        return generated;
      },
    );

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
