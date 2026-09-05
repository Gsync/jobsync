import type {
  Automation,
  FunnelStage,
} from "@/models/automation.model";
import type { AtsProvider } from "../ats/types";
import { runGreenhousePipeline } from "../greenhouse/pipeline";
import type { ScoredJob } from "../greenhouse/pipeline";
import { dedupeJobs } from "../utils";
import { getExistingJobDedupeMap } from "@/lib/jobs/jobDedupe";
import { automationLogger } from "@/lib/automation-logger";
import { log } from "@/lib/telemetry";
import type { RunnerResult, ResumeWithSections } from "./types";
import {
  getAutomationMatchLimit,
  getDefaultModelForProvider,
  getUserAiSettings,
} from "./aiSettings";
import { parseAtsConfig } from "./config";
import { extractResumeSkills } from "./resumeText";
import { persistDiscoveredJob, scalePrerank } from "./persist";
import { matchJobToResume } from "./match";
import { finalizeRun } from "./finalize";

export async function runAtsRun(
  automation: Automation,
  provider: AtsProvider,
  runId: string,
  resume: ResumeWithSections,
  signal?: AbortSignal,
): Promise<RunnerResult> {
  const label = `[${provider.label}]`;
  const config = parseAtsConfig(automation.sourceConfig, automation.jobBoard);

  if (!config || config.companies.length === 0) {
    automationLogger.log(
      automation.id,
      "error",
      `${label} No companies configured`,
    );
    automationLogger.endRun(automation.id);
    return await finalizeRun(runId, {
      status: "failed",
      errorMessage: "no_companies",
      jobsSearched: 0,
      jobsDeduplicated: 0,
      jobsProcessed: 0,
      jobsMatched: 0,
      jobsSaved: 0,
    });
  }

  try {
    automationLogger.log(
      automation.id,
      "info",
      `${label} Fetching ${config.companies.length} companies...`,
    );

    const { jobs, errors } = await provider.search(config.companies);

    for (const err of errors) {
      automationLogger.log(
        automation.id,
        "warning",
        `${label} Board '${err.token}' ${err.reason} — skipped`,
      );
    }

    const jobsSearched = jobs.length;
    automationLogger.log(
      automation.id,
      "success",
      `${label} Fetched ${jobsSearched} jobs across ${config.companies.length} boards`,
      { jobsSearched },
    );

    // Dedup against existing jobs and within this batch.
    const existingKeys = await getExistingJobDedupeMap(automation.userId);
    const dedupedJobs = dedupeJobs(jobs, existingKeys);
    const jobsDeduplicated = dedupedJobs.length;

    automationLogger.log(
      automation.id,
      "info",
      `${label} ${jobsDeduplicated} new jobs after dedup`,
      { jobsDeduplicated },
    );

    if (jobsDeduplicated === 0) {
      automationLogger.log(
        automation.id,
        "info",
        `${label} All fetched jobs already saved — nothing new to process`,
      );
      automationLogger.endRun(automation.id);
      return await finalizeRun(runId, {
        status: "completed",
        jobsSearched,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    const resumeSkills = extractResumeSkills(resume);
    const pipeline = runGreenhousePipeline(dedupedJobs, config, resumeSkills, {
      corpus: jobs,
      k: config.topK,
    });

    if (config.strictLocation && config.locations.length > 0) {
      automationLogger.log(
        automation.id,
        "info",
        `${label} ${pipeline.funnel.located} jobs remaining after strict location filter`,
      );
    }

    automationLogger.log(
      automation.id,
      "info",
      `${label} ${pipeline.funnel.relevant} jobs cleared the relevance floor`,
    );

    const buildFunnel = (analyzed: number, highlighted: number): string => {
      const stages: FunnelStage[] = [
        { key: "fetched", label: "Fetched", count: jobsSearched },
        { key: "dedup", label: "New", count: jobsDeduplicated },
      ];
      if (pipeline.funnel.located !== null) {
        stages.push({
          key: "located",
          label: "In location",
          count: pipeline.funnel.located,
        });
      }
      stages.push({
        key: "floor",
        label: "Relevant",
        count: pipeline.funnel.relevant,
      });
      stages.push({ key: "analyzed", label: "Analyzed", count: analyzed });
      stages.push({
        key: "highlighted",
        label: "Strong match",
        count: highlighted,
      });
      return JSON.stringify(stages);
    };

    if (pipeline.funnel.relevant === 0) {
      let reason: string;
      if (pipeline.funnel.located === 0) {
        reason = `none of the ${jobsDeduplicated} new job(s) matched your location filter (${config.locations.join(", ")})`;
      } else {
        const checked = pipeline.funnel.located ?? jobsDeduplicated;
        const criteria = config.targetTitles.length > 0
          ? `target titles (${config.targetTitles.join(", ")})`
          : "your search criteria";
        reason = `${checked} new job(s) were ranked but none matched ${criteria} closely enough to clear the relevance threshold`;
      }
      automationLogger.log(
        automation.id,
        "warning",
        `${label} No relevant jobs found — ${reason}. Run complete.`,
      );
      automationLogger.endRun(automation.id);
      return await finalizeRun(runId, {
        status: "completed",
        funnelStats: buildFunnel(0, 0),
        jobsSearched,
        jobsDeduplicated,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    const aiSettings = await getUserAiSettings(automation.userId);
    const modelName =
      aiSettings.model || getDefaultModelForProvider(aiSettings.provider);
    const limit = getAutomationMatchLimit(aiSettings.provider);

    let jobsSaved = 0;
    let analyzed = 0;
    let highlighted = 0;
    let aiError: string | null = null;

    // Save the un-analyzed tier (floor survivors beyond the top-K).
    if (signal?.aborted) {
      automationLogger.log(
        automation.id,
        "warning",
        `${label} Run aborted by user`,
      );
    }
    if (config.saveUnanalyzed) {
      for (const scored of pipeline.toSaveUnanalyzed) {
        if (signal?.aborted) break;
        try {
          const saved = await persistDiscoveredJob(
            automation,
            scored.job,
            scalePrerank(scored.score),
            {
              prerankScore: scored.score,
              prerankComponents: scored.components,
              analyzed: false,
            },
          );
          if (saved) jobsSaved++;
        } catch (err) {
          log.error("[ATS] Failed to save listing", {
            "automation.id": automation.id,
            provider: provider.label,
            error: String(err),
          });
        }
      }
    }

    // LLM-analyze the top-K.
    const totalToAnalyze = pipeline.toAnalyze.length;
    automationLogger.log(
      automation.id,
      "info",
      `${label} Running LLM analysis on top ${totalToAnalyze}...`,
    );

    const analyzeJob = async (scored: ScoredJob): Promise<void> => {
      // Queued tasks bail silently as slots free; the abort is logged once
      // after all dispatched tasks settle.
      if (signal?.aborted) return;

      const saveUnanalyzed = async () => {
        try {
          const saved = await persistDiscoveredJob(
            automation,
            scored.job,
            scalePrerank(scored.score),
            {
              prerankScore: scored.score,
              prerankComponents: scored.components,
              analyzed: false,
            },
          );
          if (saved) jobsSaved++;
        } catch (err) {
          log.error("[ATS] Failed to save listing", {
            "automation.id": automation.id,
            provider: provider.label,
            error: String(err),
          });
        }
      };

      if (aiError) {
        await saveUnanalyzed();
        return;
      }

      automationLogger.log(
        automation.id,
        "info",
        `${label} Analyzing: ${scored.job.title} at ${scored.job.company}`,
      );

      const matchResult = await matchJobToResume(
        scored.job,
        resume,
        automation.jobBoard,
        aiSettings,
        automation.userId,
        signal,
      );

      // Abort may have fired mid-call; bail before saving this job. This
      // check must come before the failure branch below, since an aborted
      // match resolves as a non-ai_unavailable failure and would otherwise
      // incorrectly saveUnanalyzed() a cancelled run's job.
      if (signal?.aborted) return;

      if (!matchResult.success) {
        if (matchResult.error === "ai_unavailable") {
          // Only the first concurrent task to fail logs; siblings stay quiet.
          if (!aiError) {
            aiError = `AI provider (${aiSettings.provider}) is not available.`;
            automationLogger.log(automation.id, "error", aiError);
          }
        } else {
          automationLogger.log(
            automation.id,
            "warning",
            `${label} LLM match failed: ${matchResult.error}`,
          );
        }
        await saveUnanalyzed();
        return;
      }

      analyzed++;
      const isStrong = matchResult.score >= automation.matchThreshold;
      if (isStrong) highlighted++;

      automationLogger.log(
        automation.id,
        isStrong ? "success" : "info",
        `${label} Analyzed ${analyzed}/${totalToAnalyze}: ${scored.job.title} — ${matchResult.score}%`,
        { score: matchResult.score, threshold: automation.matchThreshold },
      );

      try {
        const saved = await persistDiscoveredJob(
          automation,
          scored.job,
          matchResult.score,
          {
            ...matchResult.data,
            resumeId: resume.id,
            resumeTitle: resume.title,
            matchedAt: new Date().toISOString(),
            provider: aiSettings.provider,
            model: modelName,
            prerankScore: scored.score,
            prerankComponents: scored.components,
            analyzed: true,
          },
        );
        if (saved) jobsSaved++;
      } catch (err) {
        log.error("[ATS] Failed to save analyzed job", {
          "automation.id": automation.id,
          provider: provider.label,
          error: String(err),
        });
      }
    };

    await Promise.allSettled(
      pipeline.toAnalyze.map((scored) => limit(() => analyzeJob(scored))),
    );

    if (signal?.aborted) {
      automationLogger.log(
        automation.id,
        "warning",
        `${label} Run aborted by user`,
      );
    }

    automationLogger.log(
      automation.id,
      "success",
      `${label} LLM analysis complete (${analyzed}/${pipeline.toAnalyze.length} succeeded)`,
    );

    automationLogger.endRun(automation.id);

    return await finalizeRun(runId, {
      status: signal?.aborted ? "cancelled" : aiError ? "completed_with_errors" : "completed",
      errorMessage: aiError || undefined,
      funnelStats: buildFunnel(analyzed, highlighted),
      jobsSearched,
      jobsDeduplicated,
      jobsProcessed: analyzed,
      jobsMatched: highlighted,
      jobsSaved,
    });
  } catch (error) {
    // An abort surfaces here as an AbortError; finalize as cancelled, not failed.
    if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
      automationLogger.log(automation.id, "warning", `${label} Run aborted by user`);
      automationLogger.endRun(automation.id);
      return await finalizeRun(runId, {
        status: "cancelled",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    automationLogger.log(
      automation.id,
      "error",
      `${label} Run failed: ${message}`,
    );
    automationLogger.endRun(automation.id);
    log.error("[ATS] Run failed", {
      "automation.id": automation.id,
      "run.id": runId,
      provider: provider.label,
      error: message,
    });
    return await finalizeRun(runId, {
      status: "failed",
      errorMessage: message,
      jobsSearched: 0,
      jobsDeduplicated: 0,
      jobsProcessed: 0,
      jobsMatched: 0,
      jobsSaved: 0,
    });
  }
}
