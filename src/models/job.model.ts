import type { JobBoard, LeverHost } from "@/models/automation.model";
import { CoverLetter, Resume } from "./profile.model";
import type { JobContactLink } from "./contact.model";

export interface JobForm {
  id?: string;
  userId?: string;
  source: string;
  title: string;
  type: string;
  company: string;
  location: string;
  status: string;
  dueDate: Date;
  dateApplied?: Date;
  salaryRange?: string;
  jobDescription: string;
  jobUrl?: string;
  applied: boolean;
  workplaceType?: string | null;
}

export interface Tag {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  _count?: {
    jobs: number;
    questions: number;
    skills: number;
  };
}

export interface JobResponse {
  id: string;
  userId: string;
  JobTitle: JobTitle;
  Company: Company;
  Status: JobStatus;
  Location: JobLocation | null;
  JobSource: JobSource | null;
  jobType: string;
  workplaceType?: string | null;
  createdAt: Date;
  appliedDate: Date;
  dueDate: Date;
  salaryRange: string | null;
  description: string;
  jobUrl: string;
  applied: boolean;
  resumeId?: string;
  Resume?: Resume;
  coverLetterId?: string;
  CoverLetter?: CoverLetter;
  matchScore?: number | null;
  matchData?: string | null;
  tags?: Tag[];
  contactLinks?: JobContactLink[];
  createdVia?: string | null;
  discoveryStatus?: string | null;
  descriptionCompleteness?: DescriptionCompleteness | null;
  _count?: { Notes?: number };
}

export type JobsViewMode = "table" | "cards";

export interface JobTitle {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  _count?: {
    jobs: number;
    jobsTotal?: number;
  };
}

export interface Company {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  logoUrl?: string;
  watched?: boolean;
  watchedAt?: Date | null;
  atsProvider?: JobBoard | null;
  atsToken?: string | null;
  atsHost?: LeverHost | null;
  websiteUrl?: string | null;
  careersUrl?: string | null;
  industry?: string | null;
  _count?: {
    jobsApplied: number;
    jobsRejected?: number;
    jobsTotal?: number;
  };
}

export interface JobStatus {
  id: string;
  label: string;
  value: string;
}

export interface JobSource {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  _count?: {
    jobsApplied: number;
    jobsTotal?: number;
  };
}

export interface JobLocation {
  id: string;
  label: string;
  value: string;
  stateProv?: string;
  country?: string;
  createdBy: string;
  _count?: {
    jobsApplied: number;
    jobsTotal?: number;
  };
}

export interface Country {
  id: string;
  label: string;
  value: string;
}

export enum JOB_TYPES {
  FT = "Full-time",
  PT = "Part-time",
  C = "Contract",
}

export enum WORKPLACE_TYPES {
  REMOTE = "Remote",
  HYBRID = "Hybrid",
  ONSITE = "Onsite",
}

// Matches free-text input against a fixed enum, ignoring case and separators,
// and returns its [key, label] pair. These are closed sets, so — unlike
// canonicalizeEntityValue, which keeps punctuation on purpose so "C++" and
// "C#" cannot collapse — folding separators here is safe. Postings write
// "On-site" far more often than "Onsite", and rejecting the variant used to
// fail the whole save. Lives here rather than in resolve.ts because
// mcp.schema.ts needs it too and cannot import Prisma.
export function matchEnumEntry(
  members: Record<string, string>,
  input: string,
): [string, string] | undefined {
  const fold = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
  const folded = fold(input);
  return (Object.entries(members) as [string, string][]).find(
    ([key, label]) => fold(key) === folded || fold(label) === folded,
  );
}

export function getWorkplaceTypeLabel(
  code?: string | null,
  fallback: string = "Not specified",
): string {
  if (!code) return fallback;
  return (WORKPLACE_TYPES as Record<string, string>)[code] ?? fallback;
}

export function getJobTypeLabel(
  code?: string | null,
  fallback: string = "Not specified",
): string {
  if (!code) return fallback;
  return (JOB_TYPES as Record<string, string>)[code] ?? fallback;
}

export type DescriptionCompleteness = "title-only" | "partial" | "full";
