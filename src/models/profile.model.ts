export interface Resume {
  id?: string;
  profileId?: string;
  title: string;
  createdAt?: Date;
  updatedAt?: Date;
  ContactInfo?: ContactInfo;
  ResumeSections: ResumeSection[];
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
}
