import MarkdownIt from "markdown-it";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { normalizeJobUrl } from "@/lib/scraper/utils";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";
import type { DescriptionCompleteness } from "@/models/job.model";
import {
  resolveCompany,
  resolveJobTitle,
  resolveLocation,
  resolveJobSource,
  resolveJobType,
  resolveWorkplaceType,
  resolveJobStatus,
  resolveTags,
  type ResolvedEntity,
} from "./resolve";

// Same renderer config as createJobFromNames — html:false escapes raw HTML.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

export interface UpdateJobFromNamesInput {
  jobId: string;
  company?: string;
  jobTitle?: string;
  jobDescription?: string;
  location?: string;
  source?: string;
  jobType?: string;
  workplaceType?: string;
  status?: string;
  // Not `| null`: McpUpdateJobSchema's transform can only produce
  // Date | undefined, never null, so there's no reachable "clear the date"
  // path via MCP — a nullable type here would be dead code.
  dueDate?: Date;
  applied?: boolean;
  appliedDate?: Date;
  jobUrl?: string;
  salaryRange?: string;
  tags?: string[];
}

export interface UpdateJobFromNamesResult {
  updated: boolean;
  jobId: string;
  descriptionChanged: boolean;
  descriptionCompleteness: DescriptionCompleteness | null;
  resolutions: ResolvedEntity[];
  message: string;
}

const NOT_FOUND_MESSAGE =
  "Job not found, not owned by this token's user, or not eligible for " +
  "updates via MCP (only jobs created through MCP can be updated).";

export async function updateJobFromNames(
  input: UpdateJobFromNamesInput,
  userId: string,
): Promise<UpdateJobFromNamesResult> {
  const { jobId } = input;

  // Ownership + eligibility gate, identical to the update `where` below, so a
  // caller learns "not found" before any entity is created as a side effect.
  const existing = await prisma.job.findFirst({
    where: { id: jobId, userId, createdVia: { not: null } },
    select: { id: true, descriptionCompleteness: true },
  });
  if (!existing) {
    return {
      updated: false,
      jobId,
      descriptionChanged: false,
      descriptionCompleteness: null,
      resolutions: [],
      message: NOT_FOUND_MESSAGE,
    };
  }

  // Validate synchronously before any async resolution starts, matching
  // createJobFromNames — an invalid enum must not orphan in-flight promises.
  const jobTypeValue =
    input.jobType !== undefined ? resolveJobType(input.jobType) : undefined;
  const workplaceTypeValue =
    input.workplaceType !== undefined
      ? resolveWorkplaceType(input.workplaceType)
      : undefined;

  const [
    resolvedCompany,
    resolvedTitle,
    resolvedLocation,
    resolvedSource,
    resolvedTagsResult,
    statusId,
  ] = await Promise.all([
    input.company !== undefined ? resolveCompany(input.company, userId) : null,
    input.jobTitle !== undefined ? resolveJobTitle(input.jobTitle, userId) : null,
    input.location !== undefined ? resolveLocation(input.location, userId) : null,
    input.source !== undefined ? resolveJobSource(input.source, userId) : null,
    input.tags !== undefined
      ? resolveTags(input.tags, userId, APP_CONSTANTS.MAX_JOB_TAGS)
      : null,
    input.status !== undefined ? resolveJobStatus(input.status) : null,
  ]);

  const resolutions: ResolvedEntity[] = [
    ...(resolvedCompany ? [resolvedCompany] : []),
    ...(resolvedTitle ? [resolvedTitle] : []),
    ...(resolvedLocation ? [resolvedLocation] : []),
    ...(resolvedSource ? [resolvedSource] : []),
    ...(resolvedTagsResult ? resolvedTagsResult.resolved : []),
  ];

  const data: Record<string, unknown> = {};
  if (resolvedCompany) data.companyId = resolvedCompany.id;
  if (resolvedTitle) data.jobTitleId = resolvedTitle.id;
  if (resolvedLocation) data.locationId = resolvedLocation.id;
  if (resolvedSource) data.jobSourceId = resolvedSource.id;
  if (statusId) data.statusId = statusId;
  if (jobTypeValue !== undefined) data.jobType = jobTypeValue;
  if (workplaceTypeValue !== undefined) data.workplaceType = workplaceTypeValue;
  if (input.salaryRange !== undefined) data.salaryRange = input.salaryRange;
  if (input.dueDate !== undefined) data.dueDate = input.dueDate;
  if (input.jobUrl !== undefined) data.jobUrl = normalizeJobUrl(input.jobUrl);
  if (input.applied !== undefined) data.applied = input.applied;
  if (input.appliedDate !== undefined) data.appliedDate = input.appliedDate;
  if (input.applied === true && input.appliedDate === undefined) {
    data.appliedDate = new Date();
  }
  if (resolvedTagsResult) {
    data.tags = { set: resolvedTagsResult.resolved.map((t) => ({ id: t.id })) };
  }

  let descriptionCompleteness: DescriptionCompleteness | null =
    (existing.descriptionCompleteness as DescriptionCompleteness | null) ?? null;
  const descriptionChanged = input.jobDescription !== undefined;
  if (input.jobDescription !== undefined) {
    descriptionCompleteness = classifyDescriptionCompleteness(input.jobDescription);
    data.description = md.render(input.jobDescription);
    data.descriptionCompleteness = descriptionCompleteness;
  }

  if (Object.keys(data).length === 0) {
    return {
      updated: false,
      jobId,
      descriptionChanged: false,
      descriptionCompleteness,
      resolutions,
      message: `No fields to update for job ${jobId}.`,
    };
  }

  try {
    await prisma.job.update({
      where: { id: jobId, userId, createdVia: { not: null } },
      data,
    });
  } catch (error: any) {
    if (error?.code === "P2025") {
      return {
        updated: false,
        jobId,
        descriptionChanged: false,
        descriptionCompleteness,
        resolutions,
        message: NOT_FOUND_MESSAGE,
      };
    }
    throw error;
  }

  return {
    updated: true,
    jobId,
    descriptionChanged,
    descriptionCompleteness,
    resolutions,
    message: buildUpdateMessage(
      jobId,
      Object.keys(data),
      resolutions,
      resolvedTagsResult?.dropped ?? [],
    ),
  };
}

function buildUpdateMessage(
  jobId: string,
  changedFields: string[],
  resolutions: ResolvedEntity[],
  droppedTags: string[],
): string {
  let msg = `Job ${jobId} updated. Fields changed: ${changedFields.join(", ")}.`;
  if (resolutions.length > 0) {
    const parts = resolutions.map(
      (r) => `${r.created ? "Created" : "Matched"} ${r.label}`,
    );
    msg += ` ${parts.join("; ")}.`;
  }
  if (droppedTags.length > 0) {
    msg += ` Dropped tags exceeding limit: ${droppedTags.join(", ")}.`;
  }
  return msg;
}
