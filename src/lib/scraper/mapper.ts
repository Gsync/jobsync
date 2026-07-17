import type { ScrapedJobData, DiscoveryStatus } from "@/models/automation.model";
import db from "@/lib/db";
import { capitalize } from "@/lib/utils";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
} from "@/lib/jobs/resolve";

// Maps source employment-type strings (JSearch's "FULLTIME"/"CONTRACTOR",
// Greenhouse's absence of the field, etc.) to JOB_TYPES enum keys. Defaults
// to full-time when the source doesn't expose employment type at all.
const JOB_TYPE_ALIASES: Record<string, string> = {
  fulltime: "FT",
  parttime: "PT",
  contractor: "C",
  contract: "C",
  temporary: "C",
  intern: "C",
  internship: "C",
};

function normalizeJobType(employmentType?: string): string {
  if (!employmentType) return "FT";
  const key = employmentType.toLowerCase().replace(/[^a-z]/g, "");
  return JOB_TYPE_ALIASES[key] ?? "FT";
}

export function normalizeWorkplaceType(isRemote?: boolean): string | null {
  return isRemote ? "REMOTE" : null;
}

interface MapperInput {
  scrapedJob: ScrapedJobData;
  userId: string;
  automationId: string;
  matchScore: number;
  matchData: string;
}

interface MapperOutput {
  userId: string;
  automationId: string;
  jobUrl: string;
  description: string;
  jobType: string;
  workplaceType: string | null;
  createdAt: Date;
  applied: boolean;
  statusId: string;
  jobTitleId: string;
  companyId: string;
  jobSourceId: string;
  locationId: string | null;
  matchScore: number;
  matchData: string;
  discoveryStatus: DiscoveryStatus;
  discoveredAt: Date;
}

export async function mapScrapedJobToJobRecord(
  input: MapperInput
): Promise<MapperOutput> {
  const { scrapedJob, userId, automationId, matchScore, matchData } = input;

  // Shares the same resolve-or-create helpers (and canonical match key) as the
  // add_job path, so a company/title discovered here resolves to the same
  // record a manual add would. Source board is title-cased for a readable
  // JobSource label ("greenhouse" -> "Greenhouse"); the canonical value is
  // case-insensitive so it still matches.
  const [title, location, company, source] = await Promise.all([
    resolveJobTitle(scrapedJob.title, userId),
    scrapedJob.location
      ? resolveLocation(scrapedJob.location, userId)
      : Promise.resolve(null),
    resolveCompany(scrapedJob.company, userId),
    resolveJobSource(capitalize(scrapedJob.sourceBoard), userId),
  ]);
  const statusId = await getDefaultJobStatus();

  return {
    userId,
    automationId,
    jobUrl: scrapedJob.sourceUrl,
    description: scrapedJob.description,
    jobType: normalizeJobType(scrapedJob.employmentType),
    workplaceType:
      scrapedJob.workplaceType ?? normalizeWorkplaceType(scrapedJob.isRemote),
    createdAt: new Date(),
    applied: false,
    statusId,
    jobTitleId: title.id,
    companyId: company.id,
    jobSourceId: source.id,
    locationId: location?.id ?? null,
    matchScore,
    matchData,
    discoveryStatus: "new",
    discoveredAt: new Date(),
  };
}

async function getDefaultJobStatus(): Promise<string> {
  let status = await db.jobStatus.findFirst({ where: { value: "new" } });

  if (!status) {
    status = await db.jobStatus.create({
      data: { label: "New", value: "new" },
    });
  }

  return status.id;
}
