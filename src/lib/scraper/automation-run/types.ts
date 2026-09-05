import type { AutomationRunStatus } from "@/models/automation.model";
import type { Resume as PrismaResume } from "@prisma/client";

export interface RunnerResult {
  runId: string;
  status: AutomationRunStatus;
  jobsSearched: number;
  jobsDeduplicated: number;
  jobsProcessed: number;
  jobsMatched: number;
  jobsSaved: number;
  errorMessage?: string;
  blockedReason?: string;
}

export interface ResumeWithSections extends PrismaResume {
  ContactInfo: {
    firstName: string;
    lastName: string;
    headline: string;
    email: string;
    phone: string;
    address: string | null;
  } | null;
  ResumeSections: Array<{
    sectionType: string;
    summary?: { content: string } | null;
    workExperiences: Array<{
      description: string;
      startDate: Date;
      endDate: Date | null;
      Company: { label: string };
      jobTitle: { label: string };
      location: { label: string };
    }>;
    educations: Array<{
      institution: string;
      degree: string;
      fieldOfStudy: string;
      startDate: Date;
      endDate: Date | null;
      description: string | null;
      location: { label: string };
    }>;
    licenseOrCertifications: Array<{
      title: string;
      organization: string;
      issueDate: Date | null;
      expirationDate: Date | null;
      credentialUrl: string | null;
    }>;
    skills: Array<{
      category: string | null;
      order: number;
      Tag: { label: string };
    }>;
  }>;
}
