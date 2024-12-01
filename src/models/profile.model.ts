import { Company, JobLocation, JobTitle } from "./job.model";

export interface Resume {
  id?: string;
  profileId?: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  ContactInfo?: ContactInfo;
  ResumeSections?: ResumeSection[];
  FileId?: string;
  File?: File;
  _count?: {
    Job?: number;
  };
}

export interface File {
  id?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  uploadedAt?: Date;
  Resume?: Resume;
}

export interface ContactInfo {
  id?: string;
  createdAt: Date;
  updatedAt: Date;
  resumeId: string;
  firstName: string;
  lastName: string;
  headline: string;
  email?: string;
  phone?: string;
  address?: string;
}

export enum SectionType {
  SUMMARY = "summary",
  EXPERIENCE = "experience",
  EDUCATION = "education",
  LICENSE = "license",
  CERTIFICATION = "certification",
  COURSE = "course",
  PROJECT = "project",
  OTHER = "other",
}

export interface Summary {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  content: string;
}

export interface SummarySectionForm {
  id?: string;
  resumeId: string;
  sectionTitle: string;
  sectionType: string;
  content: string;
}

export interface ResumeSection {
  id?: string;
  resumeId: string;
  sectionTitle: string;
  sectionType: SectionType;
  summary?: Summary;
  workExperiences?: WorkExperience[];
  educations?: Education[];
}

export interface WorkExperience {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  Company: Company;
  jobTitle: JobTitle;
  location: JobLocation;
  startDate: Date;
  endDate: Date;
  currentJob?: Boolean;
  description: string;
}

export interface Education {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
  location: JobLocation;
}
