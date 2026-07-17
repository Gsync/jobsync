import prisma from "@/lib/db";
import { jobDedupeKey } from "@/lib/scraper/utils";

export interface ExistingJobRef {
  id: string;
  title: string;
  company: string;
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
export async function findExistingJobByUrl(
  userId: string,
  jobUrl: string,
): Promise<ExistingJobRef | null> {
  const key = jobDedupeKey({ url: jobUrl });
  const jobs = await prisma.job.findMany({
    where: { userId, jobUrl: { not: null } },
    select: {
      id: true,
      jobUrl: true,
      JobTitle: { select: { label: true } },
      Company: { select: { label: true } },
    },
  });
  for (const job of jobs) {
    if (jobDedupeKey({ url: job.jobUrl }) === key) {
      return {
        id: job.id,
        title: job.JobTitle.label,
        company: job.Company.label,
      };
    }
  }
  return null;
}
