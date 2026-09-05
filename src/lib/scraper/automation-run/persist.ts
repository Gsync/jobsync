import db from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import type { Automation, ScrapedJobData } from "@/models/automation.model";
import type { JobDetails } from "../types";
import { mapScrapedJobToJobRecord } from "../mapper";
import { normalizeJobUrl } from "../utils";

// Raw lexical score is ~0..PRERANK_MAX; scale into 0..99 so it fits the Int
// matchScore column and stays below a perfect LLM score (100). Internal sort
// only — never shown as a percentage.
const PRERANK_MAX =
  APP_CONSTANTS.ATS_TITLE_WEIGHT +
  APP_CONSTANTS.ATS_SKILL_WEIGHT +
  0.01;

export function scalePrerank(raw: number): number {
  return Math.min(99, Math.max(0, Math.round((raw / PRERANK_MAX) * 99)));
}

// Returns false (instead of throwing) when a concurrent run already saved
// this exact URL first — the Job_userId_jobUrl_automation_key partial unique
// index (migrations/20260710000002_job_automation_url_unique) is the
// backstop for that race, since app-level dedup only sees a point-in-time
// snapshot of existing URLs.
export async function persistDiscoveredJob(
  automation: Automation,
  job: JobDetails,
  matchScore: number,
  matchData: object,
): Promise<boolean> {
  const scrapedJob: ScrapedJobData = {
    title: job.title,
    company: job.company,
    location: job.location,
    description: job.description,
    sourceUrl: normalizeJobUrl(job.url),
    sourceBoard: automation.jobBoard,
    employmentType: job.employmentType,
    isRemote: job.isRemote,
    workplaceType: job.workplaceType,
  };

  const jobRecord = await mapScrapedJobToJobRecord({
    scrapedJob,
    userId: automation.userId,
    automationId: automation.id,
    matchScore,
    matchData: JSON.stringify(matchData),
  });

  try {
    await db.job.create({ data: jobRecord });
    return true;
  } catch (err: any) {
    if (err?.code === "P2002") return false;
    throw err;
  }
}
