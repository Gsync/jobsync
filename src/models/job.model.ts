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
  dateApplied: Date;
  salaryRange: string;
  jobDescription: string;
}

export interface JobTitle {
  id: string;
  label: string;
  value: string;
  createdBy: string;
}

export interface Company {
  id: string;
  label: string;
  value: string;
  createdBy: string;
  logoUrl?: string;
  _count?: {
    jobsApplied: number;
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
}

export interface JobLocation {
  id: string;
  label: string;
  value: string;
  stateProv?: string;
  country?: string;
  createdBy: string;
}

export interface Country {
  id: string;
  label: string;
  value: string;
}

export interface JobResponse {
  id: string;
  userId: string;
  JobTitle: JobTitle;
  Company: Company;
  Status: JobStatus;
  Location: JobLocation;
  JobSource: JobSource;
  jobType: string;
  createdAt: Date;
  appliedDate: Date;
  dueDate: Date;
  salaryRange: string;
  description: string;
}

export enum JOB_TYPES {
  FT = "Full-time",
  PT = "Part-time",
  C = "Contract",
}
