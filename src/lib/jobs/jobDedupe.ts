import prisma from "@/lib/db";
import { jobDedupeKey, normalizeJobUrl } from "@/lib/scraper/utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { entityLabelValue } from "@/lib/jobs/canonicalize";

export interface ExistingJobRef {
  id: string;
  title: string;
  company: string;
}

// A matched job plus what an agent needs to decide its next call: the
// current status, location, and whether MCP may update it.
export interface DuplicateJobRef extends ExistingJobRef {
  location: string | null;
  status: string;
  updatable: boolean;
}

// Builds a dedupe-key -> job identity map over a user's saved jobs, using the
// same canonical key (jobDedupeKey) as batch dedup. Shared by the automation
// runner (keys only, via Map.has) and add_job duplicate detection (needs the
// identity to report which existing job matched).
export async function getExistingJobDedupeMap(
  userId: string,
): Promise<Map<string, ExistingJobRef>> {
  const jobs = await prisma.job.findMany({
    where: { userId },
    select: {
      id: true,
      jobUrl: true,
      JobTitle: { select: { label: true } },
      Company: { select: { label: true } },
      Location: { select: { label: true } },
    },
  });

  const map = new Map<string, ExistingJobRef>();
  for (const job of jobs) {
    const key = jobDedupeKey({
      url: job.jobUrl,
      title: job.JobTitle?.label,
      company: job.Company?.label,
      location: job.Location?.label ?? undefined,
    });
    if (!map.has(key)) {
      map.set(key, {
        id: job.id,
        title: job.JobTitle?.label ?? "",
        company: job.Company?.label ?? "",
      });
    }
  }
  return map;
}

// Single-URL lookup for the add_job path: unlike getExistingJobDedupeMap
// (which the batch automation runner needs, since it must also dedupe
// URL-less jobs by title/company/location), a single add only ever checks
// one URL, so this skips the Location join and jobs that have no URL at all.
const existingJobByUrlSelect = {
  id: true,
  jobUrl: true,
  createdVia: true,
  Status: { select: { value: true } },
  JobTitle: { select: { label: true } },
  Company: { select: { label: true } },
  Location: { select: { label: true } },
} as const;

interface DuplicateJobRow {
  id: string;
  createdVia: string | null;
  Status: { value: string };
  JobTitle: { label: string };
  Company: { label: string };
  Location: { label: string } | null;
}

export function toDuplicateJobRef(job: DuplicateJobRow): DuplicateJobRef {
  return {
    id: job.id,
    title: job.JobTitle.label,
    company: job.Company.label,
    location: job.Location?.label ?? null,
    status: job.Status.value,
    updatable: job.createdVia != null,
  };
}

export async function findExistingJobByUrl(
  userId: string,
  jobUrl: string,
): Promise<DuplicateJobRef | null> {
  // Fast path: jobUrl is stored normalized (normalizeJobUrl), so an exact
  // match on the same normalization covers the overwhelming majority of
  // adds without scanning every URL-bearing job.
  const exact = await prisma.job.findFirst({
    where: { userId, jobUrl: normalizeJobUrl(jobUrl) },
    select: existingJobByUrlSelect,
  });
  if (exact) return toDuplicateJobRef(exact);

  // Fallback: urlDedupeKey folds host case/www, which normalizeJobUrl
  // deliberately doesn't, so a small number of stored URLs may only match
  // via the aggressive canonical key. Scan only when the fast path misses.
  const key = jobDedupeKey({ url: jobUrl });
  const jobs = await prisma.job.findMany({
    where: { userId, jobUrl: { not: null } },
    select: existingJobByUrlSelect,
  });
  for (const job of jobs) {
    if (jobDedupeKey({ url: job.jobUrl }) === key) return toDuplicateJobRef(job);
  }
  return null;
}

export interface JobNameLookup {
  company?: string;
  jobTitle?: string;
  location?: string;
}

// find_job's company/title lookup: no time window, any status. A location
// narrows the match but still keeps jobs saved without one, mirroring
// add_job's duplicate rule. Newest first, capped.
export async function findJobIdsByNames(
  userId: string,
  names: JobNameLookup,
): Promise<string[]> {
  const jobs = await prisma.job.findMany({
    where: {
      userId,
      ...(names.company && {
        Company: { value: entityLabelValue(names.company, { stripLegalSuffix: true }) },
      }),
      ...(names.jobTitle && {
        JobTitle: { value: entityLabelValue(names.jobTitle) },
      }),
      ...(names.location && {
        OR: [
          { Location: { value: entityLabelValue(names.location) } },
          { locationId: null },
        ],
      }),
    },
    select: { id: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: APP_CONSTANTS.MCP_FIND_JOB_MAX_MATCHES,
  });
  return jobs.map((job) => job.id);
}
