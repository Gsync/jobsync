import { generateText, Output } from "ai";
import db from "@/lib/db";
import type {
  Automation,
  AutomationRunStatus,
} from "@/models/automation.model";
import type { ConnectorError, DiscoveredVacancy } from "./types";
import { connectorRegistry } from "./connectors";
import { mapScrapedJobToJobRecord } from "./mapper";
import { normalizeJobUrl } from "./utils";
import { calculateNextRunAt } from "./schedule";
import {
  getModel,
  JobMatchSchema,
  JOB_MATCH_SYSTEM_PROMPT,
  buildJobMatchPrompt,
} from "@/lib/ai";
import {
  AiProvider,
  OllamaModel,
  OpenaiModel,
  DeepseekModel,
} from "@/models/ai.model";
import type { Resume as PrismaResume } from "@prisma/client";
import { automationLogger } from "@/lib/automation-logger";
import {
  defaultUserSettings,
  type AiSettings,
} from "@/models/userSettings.model";


const MAX_JOBS_PER_RUN = 10;

function getDefaultModelForProvider(provider: AiProvider): string {
  switch (provider) {
    case AiProvider.OLLAMA:
      return OllamaModel.LLAMA3_2;
    case AiProvider.OPENAI:
      return OpenaiModel.GPT4O_MINI;
    case AiProvider.DEEPSEEK:
      return DeepseekModel.DEEPSEEK_CHAT;
  }
}

async function getUserAiSettings(userId: string): Promise<AiSettings> {
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

function getErrorMessage(error: ConnectorError): string {
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
  }>;
}

export async function runAutomation(
  automation: Automation,
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

  try {
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

    automationLogger.log(
      automation.id,
      "info",
      `Searching for jobs: "${automation.keywords}" in ${automation.location}`,
    );

    const connector = connectorRegistry.create(automation.jobBoard);
    const searchResult = await connector.search({
      keywords: automation.keywords,
      location: automation.location,
      connectorParams: automation.connectorParams
        ? JSON.parse(automation.connectorParams)
        : undefined,
    });

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
      `Found ${jobsSearched} jobs from ${connector.name}`,
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

    const existingJobUrls = await getExistingJobUrls(automation.userId);
    const newJobs = searchResult.data.filter(
      (job) => !existingJobUrls.has(normalizeJobUrl(job.sourceUrl)),
    );
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

    const aiSettings = await getUserAiSettings(automation.userId);

    // JSearch returns full job details, no separate extraction needed
    for (const job of jobsToProcess) {
      automationLogger.log(
        automation.id,
        "info",
        `Processing: ${job.title} at ${job.employerName}`,
      );

      jobsProcessed++;

      const modelName = aiSettings.model || getDefaultModelForProvider(aiSettings.provider);
      automationLogger.log(
        automation.id,
        "info",
        `Analyzing job match for: ${job.title} (using ${aiSettings.provider}/${modelName})`,
      );

      const matchResult = await matchJobToResume(
        job,
        resume as ResumeWithSections,
        aiSettings,
        automation.userId,
      );

      if (!matchResult.success) {
        if (matchResult.error === "ai_unavailable") {
          aiError = `AI provider (${aiSettings.provider}) is not available. Please check your settings.`;
          automationLogger.log(automation.id, "error", aiError);
          break;
        }
        automationLogger.log(
          automation.id,
          "warning",
          `AI matching failed: ${matchResult.error}`,
        );
        continue;
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
        continue;
      }

      jobsMatched++;

      automationLogger.log(
        automation.id,
        "success",
        `Job matched! Saving to database...`,
        {
          title: job.title,
          company: job.employerName,
        },
      );

      try {
        const vacancy: DiscoveredVacancy = {
          ...job,
          sourceUrl: normalizeJobUrl(job.sourceUrl),
        };

        const jobRecord = await mapScrapedJobToJobRecord({
          vacancy,
          userId: automation.userId,
          automationId: automation.id,
          matchScore: matchResult.score,
          matchData: JSON.stringify({
            ...matchResult.data,
            resumeId: resume.id,
            resumeTitle: resume.title,
            matchedAt: new Date().toISOString(),
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
    }

    const finalStatus: AutomationRunStatus = aiError
      ? "failed"
      : jobsProcessed < jobsToProcess.length
        ? "completed_with_errors"
        : "completed";

    automationLogger.log(
      automation.id,
      finalStatus === "completed"
        ? "success"
        : finalStatus === "failed"
          ? "error"
          : "warning",
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
  }
}

async function getExistingJobUrls(userId: string): Promise<Set<string>> {
  const existingJobs = await db.job.findMany({
    where: { userId },
    select: { jobUrl: true },
  });

  const urls = new Set<string>();
  for (const job of existingJobs) {
    if (job.jobUrl) {
      urls.add(normalizeJobUrl(job.jobUrl));
    }
  }
  return urls;
}

interface MatchResult {
  success: boolean;
  score: number;
  data?: object;
  error?: string;
}

async function matchJobToResume(
  job: DiscoveredVacancy,
  resume: ResumeWithSections,
  aiSettings: AiSettings,
  userId: string,
): Promise<MatchResult> {
  try {
    const resumeText = await convertResumeForMatch(resume);
    const jobText = `
Title: ${job.title}
Company: ${job.employerName}
Location: ${job.location}
${job.salary ? `Salary: ${job.salary}` : ""}

Description:
${job.description}
`.trim();

    const provider = aiSettings.provider;
    const modelName = aiSettings.model || getDefaultModelForProvider(provider);
    const model = await getModel(provider, modelName, userId);

    const result = await generateText({
      model,
      output: Output.object({
        schema: JobMatchSchema,
      }),
      system: JOB_MATCH_SYSTEM_PROMPT,
      prompt: buildJobMatchPrompt(resumeText, jobText),
      temperature: 0.3,
    });

    const matchData = result.experimental_output;
    if (!matchData) {
      return { success: false, score: 0, error: "No match data returned" };
    }

    return {
      success: true,
      score: matchData.matchScore,
      data: matchData,
    };
  } catch (error) {
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
  }

  return parts.filter(Boolean).join("\n");
}

function getStatusFromError(error: ConnectorError): AutomationRunStatus {
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
