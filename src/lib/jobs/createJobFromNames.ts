import MarkdownIt from "markdown-it";
import { addDays } from "date-fns";
import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { normalizeJobUrl } from "@/lib/scraper/utils";
import {
  findExistingJobByUrl,
  toDuplicateJobRef,
  type DuplicateJobRef,
} from "@/lib/jobs/jobDedupe";
import { createJobRecord } from "@/lib/jobs/createJobRecord";
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

// html:false escapes any raw HTML in the input; TipTapContentViewer further
// strips unrecognized tags, so the stored/rendered description is safe.
const md = new MarkdownIt({ html: false, linkify: false, breaks: true });

export interface CreateJobFromNamesInput {
  company: string;
  jobTitle: string;
  jobDescription: string;
  location?: string;
  source?: string;
  jobType?: string;
  workplaceType?: string;
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
  duplicateOf?: DuplicateJobRef;
  resolutions: ResolvedEntity[];
  descriptionCompleteness?: DescriptionCompleteness;
  message: string;
}

// Reported to callers that show progress; MCP and API v1 pass nothing.
type CreateJobStep = "resolve" | "duplicate" | "save";

export async function createJobFromNames(
  input: CreateJobFromNamesInput,
  userId: string,
  onStep?: (step: CreateJobStep) => void,
): Promise<CreateJobFromNamesResult> {
  const {
    company,
    jobTitle,
    jobDescription,
    location,
    source,
    jobType,
    workplaceType,
    status,
    dueDate = addDays(new Date(), APP_CONSTANTS.DEFAULT_JOB_DUE_DAYS),
    applied = false,
    appliedDate,
    jobUrl,
    salaryRange,
    tags = [],
    allowDuplicate = false,
    createdVia,
  } = input;

  // Validate synchronously before starting any async resolution work, so an
  // invalid jobType/workplaceType can't orphan already-started promises.
  const jobTypeValue = resolveJobType(jobType);
  const workplaceTypeValue = resolveWorkplaceType(workplaceType);

  onStep?.("resolve");
  // Resolve Bucket A and B in parallel where possible
  const [
    resolvedCompany,
    resolvedTitle,
    resolvedLocation,
    resolvedSource,
    resolvedTagsResult,
    statusId,
  ] = await Promise.all([
    resolveCompany(company, userId),
    resolveJobTitle(jobTitle, userId),
    location ? resolveLocation(location, userId) : Promise.resolve(null),
    source ? resolveJobSource(source, userId) : Promise.resolve(null),
    resolveTags(tags, userId, APP_CONSTANTS.MAX_JOB_TAGS),
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
    onStep?.("duplicate");
    const duplicate = await detectDuplicate({
      userId,
      companyId: resolvedCompany.id,
      jobTitleId: resolvedTitle.id,
      jobUrl,
    });
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

  const descriptionCompleteness = classifyDescriptionCompleteness(jobDescription);

  onStep?.("save");
  const job = await createJobRecord({
    jobTitleId: resolvedTitle.id,
    companyId: resolvedCompany.id,
    locationId: resolvedLocation?.id ?? null,
    statusId,
    jobSourceId: resolvedSource?.id ?? null,
    salaryRange: salaryRange ?? null,
    dueDate,
    appliedDate: resolvedAppliedDate,
    // Markdown-rendered here, unlike UI-created jobs which store raw
    // Tiptap HTML directly — both are valid HTML for TipTapContentViewer,
    // but don't assume Tiptap-specific structure when reading this field.
    description: md.render(jobDescription),
    jobType: jobTypeValue,
    workplaceType: workplaceTypeValue,
    userId,
    jobUrl: jobUrl ? normalizeJobUrl(jobUrl) : null,
    applied,
    tagIds: resolvedTagsResult.resolved.map((t) => t.id),
    createdVia: createdVia ?? null,
    descriptionCompleteness,
  });

  const message = buildSuccessMessage(resolutions, resolvedTagsResult.dropped, job.id);

  return {
    created: true,
    jobId: job.id,
    resolutions,
    descriptionCompleteness,
    message,
  };
}

interface DuplicateQuery {
  userId: string;
  companyId: string;
  jobTitleId: string;
  jobUrl?: string;
}

async function detectDuplicate(
  query: DuplicateQuery,
): Promise<DuplicateJobRef | null> {
  const { userId, companyId, jobTitleId, jobUrl } = query;
  // Tier 1 — URL match (no time window). Uses the same canonical key as
  // automation dedup (jobDedupeKey folds host case, leading "www.", param
  // order, and tracking params), so URL variants of the same posting are
  // caught — not just exact-string matches.
  if (jobUrl) {
    const byUrl = await findExistingJobByUrl(userId, jobUrl);
    if (byUrl) return byUrl;
  }

  // Tier 2 — company + title within window. Location is not compared:
  // spellings vary ("Toronto, ON" vs "Toronto, Ontario"), so it is reported
  // in the message and the agent decides via allowDuplicate.
  const windowDays = APP_CONSTANTS.MCP_DUPLICATE_WINDOW_DAYS;
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);
  const byNameWindow = await prisma.job.findFirst({
    where: {
      userId,
      companyId,
      jobTitleId,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      createdVia: true,
      Status: { select: { value: true } },
      JobTitle: { select: { label: true } },
      Company: { select: { label: true } },
      Location: { select: { label: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  });
  return byNameWindow ? toDuplicateJobRef(byNameWindow) : null;
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
  dup: DuplicateJobRef,
  resolutions: ResolvedEntity[],
): string {
  const parts = resolutions.map((r) => {
    const action = r.created ? "Created" : "Matched";
    return `${action} ${r.label}`;
  });
  const next = dup.updatable
    ? `To enrich or correct it, call update_job with jobId "${dup.id}" instead of re-adding. `
    : `It was created in the web app, so it cannot be updated through MCP — leave it as is. `;
  return (
    `Duplicate detected — existing job "${dup.title}" at "${dup.company}" ` +
    `(id: ${dup.id}, status: ${dup.status}, location: ${dup.location ?? "none"}). ` +
    next +
    `Pass allowDuplicate: true only if this is genuinely a different posting. ` +
    `Resolutions: ${parts.join("; ")}.`
  );
}
