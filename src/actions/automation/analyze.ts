"use server";

import { buildLlmMatchData } from "@/lib/ai/jobMatch/matchResult";
import db from "@/lib/db";
import { requireUser } from "../shared";
import { runTrackedGeneration } from "@/lib/ai/trackedGeneration";
import {
  getModel,
  parseJobMatch,
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
  preprocessResume,
  preprocessJob,
} from "@/lib/ai";
import { getResumeById } from "@/actions/profile.actions";
import { getJobDetails } from "@/actions/job.actions";
import { automationLogger } from "@/lib/automation-logger";
import { resolveAiConfig } from "@/lib/ai/aiConfig";
import {
  inputSizeAttrs,
  SURFACES,
} from "@/lib/telemetry";
import type { DescriptionCompleteness } from "@/models/job.model";
import { formatError } from "./shared";

// Runs an on-demand LLM match for an un-analyzed discovered job using the
// resume tied to its automation and the user's AI settings (no model picker —
// mirrors the automation runner). Upgrades matchData with analyzed: true.
export async function analyzeDiscoveredJob(jobId: string): Promise<{
  success: boolean;
  matchScore?: number;
  message?: string;
}> {
  try {
    const user = await requireUser();

    const job = await db.job.findFirst({
      where: { id: jobId, userId: user.id, automationId: { not: null } },
      include: { automation: { select: { resumeId: true } } },
    });

    if (!job) {
      return { success: false, message: "Discovered job not found" };
    }

    if (job.automationId && automationLogger.isRunning(job.automationId)) {
      return {
        success: false,
        message:
          "A run is in progress for this automation. Please wait until it completes before analyzing jobs.",
      };
    }

    const resumeId = job.automation?.resumeId;
    if (!resumeId) {
      return { success: false, message: "Automation resume is missing" };
    }

    const { config: ai, configuredModel } = await resolveAiConfig(user.id, "analyze");
    if (!ai.modelName) {
      return { success: false, message: "No AI model is selected. Pick one in Settings → AI Provider." };
    }

    const [{ data: resume }, { job: jobDetails }] = await Promise.all([
      getResumeById(resumeId),
      getJobDetails(jobId),
    ]);

    const [resumePre, jobPre] = await Promise.all([
      preprocessResume(resume),
      preprocessJob(jobDetails),
    ]);

    if (!resumePre.success || !jobPre.success) {
      return { success: false, message: "Failed to prepare match inputs" };
    }

    const model = await getModel(ai.provider, ai.modelName, user.id);

    const promptText = buildJobMatchPrompt(
      resumePre.data.normalizedText,
      jobPre.data.normalizedText,
    );

    const result = await runTrackedGeneration({
      userId: user.id,
      feature: "automations",
      spanName: "automation.analyze",
      surface: SURFACES.JOB_MATCH,
      ai: { ...ai, model },
      system: JOB_MATCH_SYSTEM_PROMPT,
      prompt: promptText,
      temperature: 0.3,
      attrs: {
        ...inputSizeAttrs({
          resumeChars: resumePre.data.normalizedText.length,
          jobChars: jobPre.data.normalizedText.length,
        }),
        "jobsync.user_id": user.id,
        "jobsync.job_id": jobId,
      },
    });

    const { scores, body } = parseJobMatch(result.text);
    if (!scores) {
      return { success: false, message: "AI did not return a match score" };
    }

    const matchData = buildLlmMatchData({
      scores,
      body,
      resume: { id: resumeId, title: resume.title },
      matchedAt: new Date(),
      provider: ai.provider,
      model: configuredModel,
      descriptionCompleteness:
        (job.descriptionCompleteness as DescriptionCompleteness | null) ?? undefined,
    });

    await db.job.update({
      where: { id: jobId, userId: user.id },
      data: { matchScore: scores.matchScore, matchData },
    });

    return { success: true, matchScore: scores.matchScore };
  } catch (error) {
    return formatError(error, "Failed to analyze discovered job");
  }
}
