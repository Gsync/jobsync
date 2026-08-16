import { createHash } from "crypto";
import MarkdownIt from "markdown-it";
import prisma from "@/lib/db";
import { convertResumeToText } from "@/lib/ai/tools/preprocessing";
import {
  normalizeBullets,
  normalizeHeadings,
  normalizeWhitespace,
  removeHtmlTags,
} from "@/lib/ai/tools/text-processing";
import { classifyDescriptionCompleteness } from "@/lib/jobs/descriptionCompleteness";
import { getDefaultResumeForUser } from "@/lib/jobs/getDefaultResumeForUser";
import type { DescriptionCompleteness } from "@/models/job.model";
import type { Resume } from "@/models/profile.model";

const DEFAULT_LIMIT = 100;
export const MAX_INTEGRATION_JOBS_LIMIT = 100;
const markdown = new MarkdownIt({ html: false, linkify: false, breaks: true });

const jobSelect = {
  id: true,
  jobUrl: true,
  description: true,
  jobType: true,
  workplaceType: true,
  salaryRange: true,
  descriptionCompleteness: true,
  JobTitle: { select: { label: true } },
  Company: { select: { label: true } },
  Location: { select: { label: true } },
} as const;

type IntegrationJobRecord = {
  id: string;
  jobUrl: string | null;
  description: string;
  jobType: string;
  workplaceType: string | null;
  salaryRange: string | null;
  descriptionCompleteness: string | null;
  JobTitle: { label: string };
  Company: { label: string };
  Location: { label: string } | null;
};

export interface IntegrationResumeSnapshot {
  id: string;
  title: string;
  fingerprint: string;
  content?: string;
}

export interface IntegrationJobDetail {
  id: string;
  jobUrl: string | null;
  title: string;
  company: string;
  location: string | null;
  workplaceType: string | null;
  jobType: string;
  salaryRange: string | null;
  descriptionCompleteness: DescriptionCompleteness;
  description: string;
  fingerprint: string;
}

function fingerprint(namespace: string, value: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify([namespace, value]))
    .digest("hex");
}

export function normalizeJobDescription(description: string): string {
  const html = /<\/?[a-z][\s\S]*>/i.test(description)
    ? description
    : markdown.render(description);
  return normalizeHeadings(
    normalizeBullets(normalizeWhitespace(removeHtmlTags(html))),
  );
}

function sortById<T extends { id?: string }>(items: T[] | undefined): T[] | undefined {
  return items ? [...items].sort((a, b) => (a.id ?? "").localeCompare(b.id ?? "")) : items;
}

function canonicalizeResume(resume: Resume): Resume {
  return {
    ...resume,
    ResumeSections: sortById(resume.ResumeSections)?.map((section) => ({
      ...section,
      workExperiences: sortById(section.workExperiences),
      educations: sortById(section.educations),
      licenseOrCertifications: sortById(section.licenseOrCertifications),
      others: sortById(section.others),
      skills: section.skills
        ? [...section.skills].sort(
            (a, b) => a.order - b.order || (a.id ?? "").localeCompare(b.id ?? ""),
          )
        : section.skills,
    })),
  };
}

export function serializeIntegrationJob(
  job: IntegrationJobRecord,
): IntegrationJobDetail {
  const description = normalizeJobDescription(job.description);
  const descriptionCompleteness = (
    job.descriptionCompleteness ?? classifyDescriptionCompleteness(description)
  ) as DescriptionCompleteness;
  const detail = {
    id: job.id,
    jobUrl: job.jobUrl,
    title: job.JobTitle.label,
    company: job.Company.label,
    location: job.Location?.label ?? null,
    workplaceType: job.workplaceType,
    jobType: job.jobType,
    salaryRange: job.salaryRange,
    descriptionCompleteness,
    description,
  };

  return {
    ...detail,
    fingerprint: fingerprint("jobsync-job-v1", detail),
  };
}

function encodeCursor(id: string): string {
  return Buffer.from(JSON.stringify({ v: 1, id }), "utf8").toString("base64url");
}

export function parseIntegrationJobsQuery(url: string): {
  cursorId?: string;
  limit: number;
} {
  const { searchParams } = new URL(url);
  const limitValue = searchParams.get("limit");
  const cursorValue = searchParams.get("cursor");
  const limit = limitValue === null ? DEFAULT_LIMIT : Number(limitValue);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_INTEGRATION_JOBS_LIMIT) {
    throw new Error(`limit must be an integer from 1 to ${MAX_INTEGRATION_JOBS_LIMIT}`);
  }

  if (!cursorValue) return { limit };

  try {
    const parsed = JSON.parse(Buffer.from(cursorValue, "base64url").toString("utf8"));
    if (parsed?.v !== 1 || typeof parsed.id !== "string" || !parsed.id) {
      throw new Error("Invalid cursor");
    }
    return { cursorId: parsed.id, limit };
  } catch {
    throw new Error("cursor is invalid");
  }
}

export async function getIntegrationResumeSnapshot(
  userId: string,
  includeContent: boolean,
): Promise<IntegrationResumeSnapshot | null> {
  const resume = await getDefaultResumeForUser(userId);
  if (!resume?.id) return null;

  const content = normalizeHeadings(
    normalizeBullets(
      normalizeWhitespace(await convertResumeToText(canonicalizeResume(resume))),
    ),
  );
  const snapshot: IntegrationResumeSnapshot = {
    id: resume.id,
    title: resume.title,
    fingerprint: fingerprint("jobsync-resume-v1", {
      id: resume.id,
      title: resume.title,
      content,
    }),
  };

  return includeContent ? { ...snapshot, content } : snapshot;
}

export async function listIntegrationJobs(
  userId: string,
  cursorId: string | undefined,
  limit: number,
) {
  const records = await prisma.job.findMany({
    where: {
      userId,
      ...(cursorId ? { id: { gt: cursorId } } : {}),
    },
    orderBy: { id: "asc" },
    take: limit + 1,
    select: jobSelect,
  });
  const hasMore = records.length > limit;
  const page = records.slice(0, limit).map(serializeIntegrationJob);

  return {
    jobs: page.map(({ id, fingerprint: jobFingerprint, descriptionCompleteness }) => ({
      id,
      fingerprint: jobFingerprint,
      descriptionCompleteness,
    })),
    nextCursor: hasMore && page.length > 0 ? encodeCursor(page[page.length - 1].id) : null,
  };
}

export async function getOwnedIntegrationJob(userId: string, id: string) {
  const record = await prisma.job.findFirst({
    where: { id, userId },
    select: jobSelect,
  });
  return record ? serializeIntegrationJob(record) : null;
}
