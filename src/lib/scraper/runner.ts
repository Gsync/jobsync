import { generateText } from "ai";
import pLimit from "p-limit";
import db from "@/lib/db";
import type {
  Automation,
  AutomationRunStatus,
  ScrapedJobData,
  JobBoard,
  FunnelStage,
} from "@/models/automation.model";
import type { ScraperError, JobDetails } from "./types";
import { searchJSearchJobs } from "./jsearch";
import { searchGreenhouseJobs } from "./greenhouse";
import { runGreenhousePipeline } from "./greenhouse/pipeline";
import type { ScoredJob } from "./greenhouse/pipeline";
import { mapScrapedJobToJobRecord } from "./mapper";
import { normalizeJobUrl, dedupeJobs, jobDedupeKey } from "./utils";
import { calculateNextRunAt } from "./schedule";
import { APP_CONSTANTS } from "@/lib/constants";
import {
  getModel,
  parseJobMatch,
  AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
  buildAutomationJobMatchPrompt,
  removeHtmlTags,
} from "@/lib/ai";
import {
  AiProvider,
  OllamaModel,
  OpenaiModel,
  DeepseekModel,
  GeminiModel,
} from "@/models/ai.model";
import type { Resume as PrismaResume } from "@prisma/client";
import { automationLogger } from "@/lib/automation-logger";
import {
  defaultUserSettings,
  type AiSettings,
} from "@/models/userSettings.model";
import { resolveApiKey } from "@/lib/api-key-resolver";
import { PROVIDER_VERIFIERS } from "@/lib/ai/provider-registry.server";
import { getOllamaBaseUrl } from "@/actions/apiKey.actions";

const MAX_JOBS_PER_RUN = APP_CONSTANTS.MAX_JOBS_PER_RUN;

// Ollama serializes on the GPU, so it must process matches one at a time;
// other providers can fan out concurrently.
function getAutomationMatchLimit(provider: AiProvider) {
  const concurrency =
    provider === AiProvider.OLLAMA
      ? 1
      : APP_CONSTANTS.AUTOMATION_MATCH_CONCURRENCY;
  return pLimit(concurrency);
}

function getDefaultModelForProvider(provider: AiProvider): string {
  switch (provider) {
    case AiProvider.OLLAMA:
      return OllamaModel.LLAMA3_2;
    case AiProvider.OPENAI:
      return OpenaiModel.GPT4O_MINI;
    case AiProvider.DEEPSEEK:
      return DeepseekModel.DEEPSEEK_CHAT;
    case AiProvider.GEMINI:
      return GeminiModel.GEMINI_2_0_FLASH;
    case AiProvider.OPENROUTER:
      return "anthropic/claude-3.5-sonnet";
  }
}

export async function getUserAiSettings(userId: string): Promise<AiSettings> {
  const userSettings = await db.userSettings.findUnique({
    where: { userId },
  });

  if (!userSettings) {
    return defaultUserSettings.ai;
  }

  const settings = JSON.parse(userSettings.settings);
  return {
    ...defaultUserSettings.ai,
    ...settings.ai,
  };
}

function getErrorMessage(error: ScraperError): string {
  switch (error.type) {
    case "blocked":
      return error.reason;
    case "rate_limited":
      return `Rate limited${error.retryAfter ? ` - retry after ${error.retryAfter}s` : ""}`;
    case "network":
    case "parse":
      return error.message;
  }
}

export interface RunnerResult {
  runId: string;
  status: AutomationRunStatus;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
  errorMessage?: string;
  blockedReason?: string;
}

interface ResumeWithSections extends PrismaResume {
  ContactInfo: {
    firstName: string;
    lastName: string;
    headline: string;
    email: string;
    phone: string;
    address: string | null;
  } | null;
  ResumeSections: Array<{
    sectionType: string;
    summary?: { content: string } | null;
    workExperiences: Array<{
      description: string;
      startDate: Date;
      endDate: Date | null;
      Company: { label: string };
      jobTitle: { label: string };
      location: { label: string };
    }>;
    educations: Array<{
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startDate: Date;
      endDate: Date | null;
      description: string | null;
      location: { label: string };
    }>;
    licenseOrCertifications: Array<{
      title: string;
      organization: string;
      issueDate: Date | null;
      expirationDate: Date | null;
      credentialUrl: string | null;
    }>;
    skills: Array<{
      category: string | null;
      order: number;
      Tag: { label: string };
    }>;
  }>;
}

export async function runAutomation(
  automation: Automation,
  signal?: AbortSignal,
): Promise<RunnerResult> {
  console.log(`[Automation ${automation.id}] Starting automation run`);
  automationLogger.startRun(automation.id);

  const run = await db.automationRun.create({
    data: {
      automationId: automation.id,
      status: "running",
    },
  });

  console.log(`[Automation ${automation.id}] Created run with ID: ${run.id}`);
  automationLogger.log(
    automation.id,
    "info",
    `Created automation run with ID: ${run.id}`,
  );

  // Abort the run from two sources: the request connection dropping, and a
  // user cancel flag (polled). The cancel flag lives on automationLogger — the
  // same shared singleton the SSE reads — so it is reliably visible here even
  // though the cancel request arrives on a different route. Aborting the
  // controller propagates into the in-flight LLM call (abortSignal).
  const controller = new AbortController();
  const onParentAbort = () => controller.abort();
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", onParentAbort);
  }
  let dbCancelCheckInFlight = false;
  const cancelPoll = setInterval(() => {
    if (controller.signal.aborted) return;

    // Fast path: in-memory flag (only works when /cancel shares this process).
    if (automationLogger.isCancelRequested(automation.id)) {
      controller.abort();
      return;
    }

    // Reliable path: the /cancel route flips the run row to "cancelling". This
    // survives module/process boundaries where the in-memory flag does not.
    if (dbCancelCheckInFlight) return;
    dbCancelCheckInFlight = true;
    db.automationRun
      .findUnique({ where: { id: run.id }, select: { status: true } })
      .then((row) => {
        if (row?.status === "cancelling") controller.abort();
      })
      .catch(() => {})
      .finally(() => {
        dbCancelCheckInFlight = false;
      });
  }, 500);
  const effectiveSignal = controller.signal;

  try {
    // Checked here (not just in the manual /run route) so scheduled/cron
    // runs also fail fast instead of silently completing with 0 matches.
    const aiSettings = await getUserAiSettings(automation.userId);
    if (aiSettings.provider === AiProvider.OLLAMA) {
      const ollamaCheck = await PROVIDER_VERIFIERS.ollama(
        await getOllamaBaseUrl(automation.userId),
      );
      if (!ollamaCheck.success) {
        const message =
          ollamaCheck.error ||
          "Ollama is not available. Please make sure Ollama is running.";
        automationLogger.log(automation.id, "error", message);
        automationLogger.endRun(automation.id);

        return await finalizeRun(run.id, {
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

    automationLogger.log(automation.id, "info", "Fetching resume data...");

    const resume = await db.resume.findUnique({
      where: { id: automation.resumeId },
      include: {
        ContactInfo: true,
        ResumeSections: {
          include: {
            summary: true,
            workExperiences: {
              include: {
                Company: true,
                jobTitle: true,
                location: true,
              },
            },
            educations: {
              include: {
                location: true,
              },
            },
            licenseOrCertifications: true,
            skills: { include: { Tag: true } },
          },
        },
      },
    });

    if (!resume) {
      automationLogger.log(
        automation.id,
        "error",
        "Resume not found or missing",
      );
      automationLogger.endRun(automation.id);

      return await finalizeRun(run.id, {
        status: "failed",
        errorMessage: "resume_missing",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    automationLogger.log(
      automation.id,
      "success",
      `Resume loaded: ${resume.title}`,
    );

    if (automation.jobBoard === "greenhouse") {
      return await runGreenhouseRun(
        automation,
        run.id,
        resume as ResumeWithSections,
        effectiveSignal,
      );
    }

    automationLogger.log(
      automation.id,
      "info",
      `Searching for jobs: "${automation.keywords}" in ${automation.location}`,
    );

    // Use JSearch API with user's key if available
    const rapidApiKey = await resolveApiKey(automation.userId, "rapidapi");
    const searchResult = await searchJSearchJobs(
      automation.keywords,
      automation.location,
      rapidApiKey,
    );

    if (!searchResult.success) {
      automationLogger.log(
        automation.id,
        "error",
        `Search failed: ${searchResult.error.type} - ${getErrorMessage(searchResult.error)}`,
      );
      automationLogger.endRun(automation.id);

      const status = getStatusFromError(searchResult.error);
      return await finalizeRun(run.id, {
        status,
        errorMessage:
          searchResult.error.type === "network"
            ? searchResult.error.message
            : undefined,
        blockedReason:
          searchResult.error.type === "blocked"
            ? searchResult.error.reason
            : undefined,
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    const jobsSearched = searchResult.data.length;

    automationLogger.log(
      automation.id,
      "success",
      `Found ${jobsSearched} jobs from JSearch API`,
      { jobsSearched },
    );

    if (jobsSearched === 0) {
      automationLogger.log(
        automation.id,
        "warning",
        "No jobs found matching search criteria",
      );
      automationLogger.endRun(automation.id);

      return await finalizeRun(run.id, {
        status: "completed",
        jobsSearched: 0,
        jobsDeduplicated: 0,
        jobsProcessed: 0,
        jobsMatched: 0,
        jobsSaved: 0,
      });
    }

    automationLogger.log(
      automation.id,
      "info",
      "Checking for duplicate jobs...",
    );

    const existingKeys = await getExistingJobKeys(automation.userId);
    const newJobs = dedupeJobs(searchResult.data, existingKeys);
    const jobsDeduplicated = newJobs.length;

    automationLogger.log(
      automation.id,
      "info",
      `Filtered to ${jobsDeduplicated} new jobs (${jobsSearched - jobsDeduplicated} duplicates removed)`,
      { jobsDeduplicated, duplicates: jobsSearched - jobsDeduplicated },
    );

    const jobsToProcess = newJobs.slice(0, MAX_JOBS_PER_RUN);

    if (jobsToProcess.length < newJobs.length) {
      automationLogger.log(
        automation.id,
        "info",
        `Processing first ${jobsToProcess.length} of ${newJobs.length} new jobs (limit: ${MAX_JOBS_PER_RUN})`,
      );
    }

    let jobsProcessed = 0;
    let jobsMatched = 0;
    let jobsSaved = 0;
    let aiError: string | null = null;

    const limit = getAutomationMatchLimit(aiSettings.provider);

    const processJob = async (job: JobDetails): Promise<void> => {
      // Queued tasks bail immediately as slots free once aborted/errored.
      if (effectiveSignal.aborted || aiError) return;

      automationLogger.log(
        automation.id,
        "info",
        `Processing: ${job.title} at ${job.company}`,
      );

      jobsProcessed++;

      const modelName =
        aiSettings.model || getDefaultModelForProvider(aiSettings.provider);
      automationLogger.log(
        automation.id,
        "info",
        `Analyzing job match for: ${job.title} (using ${aiSettings.provider}/${modelName})`,
      );

      const matchResult = await matchJobToResume(
        job,
        resume as ResumeWithSections,
        automation.jobBoard as JobBoard,
        aiSettings,
        automation.userId,
        effectiveSignal,
      );

      // Abort may have fired mid-call; bail before saving this job.
      if (effectiveSignal.aborted) return;

      if (!matchResult.success) {
        if (matchResult.error === "ai_unavailable") {
          // Only the first concurrent task to fail logs; siblings stay quiet.
          if (!aiError) {
            aiError = `AI provider (${aiSettings.provider}) is not available. Please check your settings.`;
            automationLogger.log(automation.id, "error", aiError);
          }
        } else {
          automationLogger.log(
            automation.id,
            "warning",
            `AI matching failed: ${matchResult.error}`,
          );
        }
        return;
      }

      automationLogger.log(
        automation.id,
        "info",
        `Match score: ${matchResult.score}% (threshold: ${automation.matchThreshold}%)`,
        { score: matchResult.score, threshold: automation.matchThreshold },
      );

      if (matchResult.score < automation.matchThreshold) {
        automationLogger.log(
          automation.id,
          "info",
          `Job skipped - score below threshold`,
        );
        return;
      }

      jobsMatched++;

      automationLogger.log(
        automation.id,
        "success",
        `Job matched! Saving to database...`,
        {
          title: job.title,
          company: job.company,
        },
      );

      try {
        const scrapedJob: ScrapedJobData = {
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          sourceUrl: normalizeJobUrl(job.url),
          sourceBoard: automation.jobBoard as JobBoard,
        };

        const jobRecord = await mapScrapedJobToJobRecord({
          scrapedJob,
          userId: automation.userId,
          automationId: automation.id,
          matchScore: matchResult.score,
          matchData: JSON.stringify({
            ...matchResult.data,
            resumeId: resume.id,
            resumeTitle: resume.title,
            matchedAt: new Date().toISOString(),
            provider: aiSettings.provider,
            model: modelName,
          }),
        });

        await db.job.create({ data: jobRecord });
        jobsSaved++;

        automationLogger.log(
          automation.id,
          "success",
          `Job saved successfully (${jobsSaved} total)`,
          { jobsSaved },
        );
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        automationLogger.log(
          automation.id,
          "error",
          `Failed to save job: ${errorMsg}`,
        );
        console.error("Failed to save job:", err);
      }
    };

    // JSearch returns full job details, no separate extraction needed
    await Promise.allSettled(
      jobsToProcess.map((job) => limit(() => processJob(job))),
    );

    if (effectiveSignal.aborted) {
      automationLogger.log(automation.id, "warning", "Run aborted by user");
    }

    // Concurrent dispatch means in-flight jobs can still save after a sibling
    // sets aiError, so "failed" would be misleading — treat it as partial.
    const finalStatus: AutomationRunStatus = effectiveSignal.aborted
      ? "cancelled"
      : aiError
        ? "completed_with_errors"
        : jobsProcessed < jobsToProcess.length
          ? "completed_with_errors"
          : "completed";

    automationLogger.log(
      automation.id,
      finalStatus === "completed" ? "success" : "warning",
      `Run finished with status: ${finalStatus}`,
      {
        status: finalStatus,
        jobsSearched,
        jobsDeduplicated,
        jobsProcessed,
        jobsMatched,
        jobsSaved,
      },
    );

    automationLogger.endRun(automation.id);

    return await finalizeRun(run.id, {
      status: finalStatus,
      errorMessage: aiError || undefined,
      jobsSearched,
      jobsDeduplicated,
      jobsProcessed,
      jobsMatched,
      jobsSaved,
    });
  } catch (error) {
    // An abort surfaces here as an AbortError; finalize as cancelled, not failed.
    if (effectiveSignal.aborted || (error instanceof Error && error.name === "AbortError")) {
      automationLogger.log(automation.id, "warning", "Run aborted by user");
      automationLogger.endRun(automation.id);
      return await finalizeRun(run.id, {
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
      `Automation run failed: ${message}`,
    );
    automationLogger.endRun(automation.id);

    console.error("Automation run failed:", error);
    return await finalizeRun(run.id, {
      status: "failed",
      errorMessage: message,
      jobsSearched: 0,
      jobsDeduplicated: 0,
      jobsProcessed: 0,
      jobsMatched: 0,
      jobsSaved: 0,
    });
  } finally {
    clearInterval(cancelPoll);
    if (signal) signal.removeEventListener("abort", onParentAbort);
  }
}

async function getExistingJobKeys(userId: string): Promise<Set<string>> {
  const existingJobs = await db.job.findMany({
    where: { userId },
    select: {
      jobUrl: true,
      JobTitle: { select: { label: true } },
      Company: { select: { label: true } },
      Location: { select: { label: true } },
    },
  });

  const keys = new Set<string>();
  for (const job of existingJobs) {
    keys.add(
      jobDedupeKey({
        url: job.jobUrl,
        title: job.JobTitle?.label,
        company: job.Company?.label,
        location: job.Location?.label ?? undefined,
      }),
    );
  }
  return keys;
}

interface GreenhouseRunConfig {
  companies: { name: string; token: string }[];
  targetTitles: string[];
  keywords: string[];
  locations: string[];
  strictLocation: boolean;
  topK: number;
  saveUnanalyzed: boolean;
}

function parseGreenhouseConfig(
  sourceConfig?: string | null,
): GreenhouseRunConfig | null {
  if (!sourceConfig) return null;
  try {
    const parsed = JSON.parse(sourceConfig);
    const gh = parsed?.greenhouse;
    if (!gh || !Array.isArray(gh.companies)) return null;
    return {
      companies: gh.companies,
      targetTitles: Array.isArray(gh.targetTitles) ? gh.targetTitles : [],
      keywords: Array.isArray(gh.keywords) ? gh.keywords : [],
      locations: Array.isArray(gh.locations) ? gh.locations : [],
      strictLocation: !!gh.strictLocation,
      topK:
        typeof gh.topK === "number" && gh.topK > 0
          ? gh.topK
          : APP_CONSTANTS.MAX_JOBS_PER_RUN,
      saveUnanalyzed: gh.saveUnanalyzed !== false,
    };
  } catch {
    return null;
  }
}

function extractResumeSkills(resume: ResumeWithSections): string[] {
  const labels: string[] = [];
  for (const section of resume.ResumeSections) {
    if (section.sectionType === "skills") {
      for (const skill of section.skills) {
        if (skill.Tag?.label) labels.push(skill.Tag.label);
      }
    }
  }
  return labels;
}

// Raw lexical score is ~0..PRERANK_MAX; scale into 0..99 so it fits the Int
// matchScore column and stays below a perfect LLM score (100). Internal sort
// only — never shown as a percentage.
const PRERANK_MAX =
  APP_CONSTANTS.GREENHOUSE_TITLE_WEIGHT +
  APP_CONSTANTS.GREENHOUSE_SKILL_WEIGHT +
  0.01;

function scalePrerank(raw: number): number {
  return Math.min(99, Math.max(0, Math.round((raw / PRERANK_MAX) * 99)));
}

async function persistDiscoveredJob(
  automation: Automation,
  job: JobDetails,
  matchScore: number,
  matchData: object,
): Promise<void> {
  const scrapedJob: ScrapedJobData = {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    sourceUrl: normalizeJobUrl(job.url),
    sourceBoard: automation.jobBoard,
  };

  const jobRecord = await mapScrapedJobToJobRecord({
    scrapedJob,
    userId: automation.userId,
    automationId: automation.id,
    matchScore,
    matchData: JSON.stringify(matchData),
  });

  await db.job.create({ data: jobRecord });
}

async function runGreenhouseRun(
  automation: Automation,
  runId: string,
  resume: ResumeWithSections,
  signal?: AbortSignal,
): Promise<RunnerResult> {
  const config = parseGreenhouseConfig(automation.sourceConfig);

  if (!config || config.companies.length === 0) {
    automationLogger.log(
      automation.id,
      "error",
      "[Greenhouse] No companies configured",
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
      `[Greenhouse] Fetching ${config.companies.length} companies...`,
    );

    const { jobs, errors } = await searchGreenhouseJobs(config.companies);

    for (const err of errors) {
      automationLogger.log(
        automation.id,
        "warning",
        `[Greenhouse] Board '${err.token}' ${err.reason} — skipped`,
      );
    }

    const jobsSearched = jobs.length;
    automationLogger.log(
      automation.id,
      "success",
      `[Greenhouse] Fetched ${jobsSearched} jobs across ${config.companies.length} boards`,
      { jobsSearched },
    );

    // Dedup against existing jobs and within this batch.
    const existingKeys = await getExistingJobKeys(automation.userId);
    const dedupedJobs = dedupeJobs(jobs, existingKeys);
    const jobsDeduplicated = dedupedJobs.length;

    automationLogger.log(
      automation.id,
      "info",
      `[Greenhouse] ${jobsDeduplicated} new jobs after dedup`,
      { jobsDeduplicated },
    );

    if (jobsDeduplicated === 0) {
      automationLogger.log(
        automation.id,
        "info",
        "[Greenhouse] All fetched jobs already saved — nothing new to process",
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
        `[Greenhouse] ${pipeline.funnel.located} jobs remaining after strict location filter`,
      );
    }

    automationLogger.log(
      automation.id,
      "info",
      `[Greenhouse] ${pipeline.funnel.relevant} jobs cleared the relevance floor`,
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
        `[Greenhouse] No relevant jobs found — ${reason}. Run complete.`,
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
        "[Greenhouse] Run aborted by user",
      );
    }
    if (config.saveUnanalyzed) {
      for (const scored of pipeline.toSaveUnanalyzed) {
        if (signal?.aborted) break;
        try {
          await persistDiscoveredJob(
            automation,
            scored.job,
            scalePrerank(scored.score),
            {
              prerankScore: scored.score,
              prerankComponents: scored.components,
              analyzed: false,
            },
          );
          jobsSaved++;
        } catch (err) {
          console.error("[Greenhouse] Failed to save listing:", err);
        }
      }
    }

    // LLM-analyze the top-K.
    const totalToAnalyze = pipeline.toAnalyze.length;
    automationLogger.log(
      automation.id,
      "info",
      `[Greenhouse] Running LLM analysis on top ${totalToAnalyze}...`,
    );

    const analyzeJob = async (scored: ScoredJob): Promise<void> => {
      // Queued tasks bail silently as slots free; the abort is logged once
      // after all dispatched tasks settle.
      if (signal?.aborted) return;

      const saveUnanalyzed = async () => {
        try {
          await persistDiscoveredJob(
            automation,
            scored.job,
            scalePrerank(scored.score),
            {
              prerankScore: scored.score,
              prerankComponents: scored.components,
              analyzed: false,
            },
          );
          jobsSaved++;
        } catch (err) {
          console.error("[Greenhouse] Failed to save listing:", err);
        }
      };

      if (aiError) {
        await saveUnanalyzed();
        return;
      }

      automationLogger.log(
        automation.id,
        "info",
        `[Greenhouse] Analyzing: ${scored.job.title} at ${scored.job.company}`,
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
            `[Greenhouse] LLM match failed: ${matchResult.error}`,
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
        `[Greenhouse] Analyzed ${analyzed}/${totalToAnalyze}: ${scored.job.title} — ${matchResult.score}%`,
        { score: matchResult.score, threshold: automation.matchThreshold },
      );

      try {
        await persistDiscoveredJob(automation, scored.job, matchResult.score, {
          ...matchResult.data,
          resumeId: resume.id,
          resumeTitle: resume.title,
          matchedAt: new Date().toISOString(),
          provider: aiSettings.provider,
          model: modelName,
          prerankScore: scored.score,
          prerankComponents: scored.components,
          analyzed: true,
        });
        jobsSaved++;
      } catch (err) {
        console.error("[Greenhouse] Failed to save analyzed job:", err);
      }
    };

    await Promise.allSettled(
      pipeline.toAnalyze.map((scored) => limit(() => analyzeJob(scored))),
    );

    if (signal?.aborted) {
      automationLogger.log(
        automation.id,
        "warning",
        "[Greenhouse] Run aborted by user",
      );
    }

    automationLogger.log(
      automation.id,
      "success",
      `[Greenhouse] LLM analysis complete (${analyzed}/${pipeline.toAnalyze.length} succeeded)`,
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
      automationLogger.log(automation.id, "warning", "[Greenhouse] Run aborted by user");
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
      `[Greenhouse] Run failed: ${message}`,
    );
    automationLogger.endRun(automation.id);
    console.error("[Greenhouse] Run failed:", error);
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

interface MatchResult {
  success: boolean;
  score: number;
  data?: object;
  error?: string;
}

async function matchJobToResume(
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

    const result = await generateText({
      model,
      system: AUTOMATION_JOB_MATCH_SYSTEM_PROMPT,
      prompt: buildAutomationJobMatchPrompt(resumeText, jobText),
      temperature: 0.3,
      abortSignal: signal,
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
    console.error("AI matching error:", message);

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

async function convertResumeForMatch(
  resume: ResumeWithSections,
): Promise<string> {
  const parts: string[] = [`# ${resume.title}`];

  if (resume.ContactInfo) {
    const contact = resume.ContactInfo;
    parts.push(
      "## CONTACT",
      `Name: ${contact.firstName} ${contact.lastName}`,
      contact.headline ? `Headline: ${contact.headline}` : "",
      contact.email ? `Email: ${contact.email}` : "",
      contact.phone ? `Phone: ${contact.phone}` : "",
    );
  }

  for (const section of resume.ResumeSections) {
    if (section.sectionType === "summary" && section.summary?.content) {
      parts.push("## SUMMARY", section.summary.content);
    }

    if (
      section.sectionType === "experience" &&
      section.workExperiences.length > 0
    ) {
      parts.push("## EXPERIENCE");
      for (const exp of section.workExperiences) {
        parts.push(
          `Company: ${exp.Company.label}`,
          `Job Title: ${exp.jobTitle.label}`,
          `Location: ${exp.location.label}`,
          `Description: ${exp.description}`,
          "",
        );
      }
    }

    if (section.sectionType === "education" && section.educations.length > 0) {
      parts.push("## EDUCATION");
      for (const edu of section.educations) {
        parts.push(
          `Institution: ${edu.institution}`,
          `Degree: ${edu.degree}`,
          `Field: ${edu.fieldOfStudy}`,
          edu.description ? `Description: ${edu.description}` : "",
          "",
        );
      }
    }

    if (
      (section.sectionType === "certification" ||
        section.sectionType === "license") &&
      section.licenseOrCertifications.length > 0
    ) {
      parts.push(`## ${section.sectionType.toUpperCase()}S`);
      for (const cert of section.licenseOrCertifications) {
        parts.push(
          `Title: ${cert.title}`,
          `Organization: ${cert.organization}`,
          cert.issueDate
            ? `Issue Date: ${new Date(cert.issueDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
            : "",
          cert.expirationDate
            ? `Expiration Date: ${new Date(cert.expirationDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}`
            : "No Expiration",
          "",
        );
      }
    }

    if (section.sectionType === "skills" && section.skills.length > 0) {
      const sorted = [...section.skills].sort((a, b) => a.order - b.order);
      const grouped = new Map<string, typeof sorted>();
      for (const s of sorted) {
        const key = s.category ?? "";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)!.push(s);
      }
      parts.push("## SKILLS");
      for (const [cat, items] of grouped.entries()) {
        const labels = items.map((s) => s.Tag.label).join(", ");
        parts.push(cat ? `${cat}: ${labels}` : labels);
      }
      parts.push("");
    }
  }

  return parts.filter(Boolean).join("\n");
}

function getStatusFromError(error: ScraperError): AutomationRunStatus {
  switch (error.type) {
    case "blocked":
      return "blocked";
    case "rate_limited":
      return "rate_limited";
    default:
      return "failed";
  }
}

interface FinalizeData {
  status: AutomationRunStatus;
  errorMessage?: string;
  blockedReason?: string;
  funnelStats?: string;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
}

async function finalizeRun(
  runId: string,
  data: FinalizeData,
): Promise<RunnerResult> {
  const run = await db.automationRun.update({
    where: { id: runId },
    data: {
      status: data.status,
      errorMessage: data.errorMessage,
      blockedReason: data.blockedReason,
      funnelStats: data.funnelStats,
      jobsSearched: data.jobsSearched,
      jobsDeduplicated: data.jobsDeduplicated,
      jobsProcessed: data.jobsProcessed,
      jobsMatched: data.jobsMatched,
      jobsSaved: data.jobsSaved,
      completedAt: new Date(),
    },
  });

  await db.automation.update({
    where: { id: run.automationId },
    data: {
      lastRunAt: new Date(),
      nextRunAt: calculateNextRunAt(
        (
          await db.automation.findUnique({
            where: { id: run.automationId },
            select: { scheduleHour: true },
          })
        )?.scheduleHour || 8,
      ),
    },
  });

  return {
    runId: run.id,
    ...data,
  };
}
