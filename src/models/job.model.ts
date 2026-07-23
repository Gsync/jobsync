import { CoverLetter, Resume } from "./profile.model";

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
  salaryRange: string;
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
  salaryRange: string;
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
  createdVia?: string | null;
  discoveryStatus?: string | null;
  descriptionCompleteness?: DescriptionCompleteness | null;
  _count?: { Notes?: number };
}

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

export function getWorkplaceTypeLabel(
  code?: string | null,
  fallback: string = "Not specified",
): string {
  if (!code) return fallback;
  return (WORKPLACE_TYPES as Record<string, string>)[code] ?? fallback;
}

export type DescriptionCompleteness = "title-only" | "partial" | "full";
