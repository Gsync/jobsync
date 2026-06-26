import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { normalizeJobUrl } from "@/lib/scraper/utils";
import { createJobRecord } from "@/lib/jobs/createJobRecord";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
  resolveJobType,
  resolveJobStatus,
  resolveTags,
  type ResolvedEntity,
} from "./resolve";

export interface CreateJobFromNamesInput {
  company: string;
  jobTitle: string;
  jobDescription: string;
  location?: string;
  source?: string;
  jobType?: string;
  status?: string;
  dueDate?: Date | null;
  applied?: boolean;
  appliedDate?: Date | null;
  jobUrl?: string;
  salaryRange?: string;
  tags?: string[];
  allowDuplicate?: boolean;
  createdVia?: string;
}

export interface CreateJobFromNamesResult {
  created: boolean;
  jobId?: string;
  duplicateOf?: { id: string; title: string; company: string };
  resolutions: ResolvedEntity[];
  message: string;
}

export async function createJobFromNames(
  input: CreateJobFromNamesInput,
  userId: string,
): Promise<CreateJobFromNamesResult> {
  const {
    company,
    jobTitle,
    jobDescription,
    location,
    source,
    jobType,
    status,
    dueDate = null,
    applied = false,
    appliedDate,
    jobUrl,
    salaryRange,
    tags = [],
    allowDuplicate = false,
    createdVia,
  } = input;

  // Resolve Bucket A and B in parallel where possible
  const [
    resolvedCompany,
    resolvedTitle,
    resolvedLocation,
    resolvedSource,
    resolvedTagsResult,
    jobTypeValue,
    statusId,
  ] = await Promise.all([
    resolveCompany(company, userId),
    resolveJobTitle(jobTitle, userId),
    location ? resolveLocation(location, userId) : Promise.resolve(null),
    source ? resolveJobSource(source, userId) : Promise.resolve(null),
    resolveTags(tags, userId, APP_CONSTANTS.MAX_JOB_TAGS),
    Promise.resolve(resolveJobType(jobType)),
    resolveJobStatus(status),
  ]);

  const resolutions: ResolvedEntity[] = [
    resolvedCompany,
    resolvedTitle,
    ...(resolvedLocation ? [resolvedLocation] : []),
    ...(resolvedSource ? [resolvedSource] : []),
    ...resolvedTagsResult.resolved,
  ];

  // Duplicate detection
  if (!allowDuplicate) {
    const duplicate = await detectDuplicate(
      userId,
      resolvedCompany.id,
      resolvedTitle.id,
      jobUrl,
    );
    if (duplicate) {
      return {
        created: false,
        duplicateOf: duplicate,
        resolutions,
        message: buildDuplicateMessage(duplicate, resolutions),
      };
    }
  }

  // Default appliedDate if applied is true but no date provided
  const resolvedAppliedDate = applied && !appliedDate ? new Date() : (appliedDate ?? null);

  const job = await createJobRecord({
    jobTitleId: resolvedTitle.id,
    companyId: resolvedCompany.id,
    locationId: resolvedLocation?.id ?? null,
    statusId,
    jobSourceId: resolvedSource?.id ?? null,
    salaryRange: salaryRange ?? null,
    dueDate,
    appliedDate: resolvedAppliedDate,
    description: jobDescription,
    jobType: jobTypeValue,
    userId,
    jobUrl: jobUrl ? normalizeJobUrl(jobUrl) : null,
    applied,
    tagIds: resolvedTagsResult.resolved.map((t) => t.id),
    createdVia: createdVia ?? null,
  });

  const message = buildSuccessMessage(resolutions, resolvedTagsResult.dropped, job.id);

  return {
    created: true,
    jobId: job.id,
    resolutions,
    message,
  };
}

async function detectDuplicate(
  userId: string,
  companyId: string,
  jobTitleId: string,
  jobUrl?: string,
): Promise<{ id: string; title: string; company: string } | null> {
  // Tier 1 — URL match (no time window)
  if (jobUrl) {
    const normalized = normalizeJobUrl(jobUrl);
    const byUrl = await prisma.job.findFirst({
      where: { userId, jobUrl: normalized },
      select: { id: true, JobTitle: { select: { label: true } }, Company: { select: { label: true } } },
    });
    if (byUrl) {
      return { id: byUrl.id, title: byUrl.JobTitle.label, company: byUrl.Company.label };
    }
  }

  // Tier 2 — company + title within window
  const windowDays = APP_CONSTANTS.MCP_DUPLICATE_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const byNameWindow = await prisma.job.findFirst({
    where: {
      userId,
      companyId,
      jobTitleId,
      createdAt: { gte: since },
    },
    select: { id: true, JobTitle: { select: { label: true } }, Company: { select: { label: true } } },
  });
  if (byNameWindow) {
    return { id: byNameWindow.id, title: byNameWindow.JobTitle.label, company: byNameWindow.Company.label };
  }

  return null;
}

function buildSuccessMessage(
  resolutions: ResolvedEntity[],
  droppedTags: string[],
  jobId: string,
): string {
  const parts = resolutions.map((r) => {
    const action = r.created ? "Created" : "Matched";
    return `${action} ${r.label}`;
  });
  let msg = parts.join("; ") + `. Job created (id: ${jobId}).`;
  if (droppedTags.length > 0) {
    msg += ` Dropped tags exceeding limit: ${droppedTags.join(", ")}.`;
  }
  return msg;
}

function buildDuplicateMessage(
  dup: { id: string; title: string; company: string },
  resolutions: ResolvedEntity[],
): string {
  const parts = resolutions.map((r) => {
    const action = r.created ? "Created" : "Matched";
    return `${action} ${r.label}`;
  });
  return (
    `Duplicate detected — existing job "${dup.title}" at "${dup.company}" (id: ${dup.id}). ` +
    `Pass allowDuplicate: true to force create. Resolutions: ${parts.join("; ")}.`
  );
}
