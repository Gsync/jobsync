import { z } from "zod";

export const BACKUP_FORMAT_VERSION = 1;

export const ManifestSchema = z.object({
  formatVersion: z.literal(BACKUP_FORMAT_VERSION),
  appVersion: z.string(),
  exportedAt: z.string(),
  sourceEmail: z.string(),
  counts: z.record(z.string(), z.number()),
});

export type BackupManifest = z.infer<typeof ManifestSchema>;

const id = z.string().min(1);
const optId = z.string().min(1).nullable();
const str = z.string();
const optStr = z.string().nullable();
const dt = z.coerce.date();
const optDt = z.coerce.date().nullable();
const int = z.number().int();
const optInt = z.number().int().nullable();

// The watchlist columns are optional, not just nullable: a backup taken before
// they existed has no such key, and undefined leaves Prisma on the default.
const Company = z.object({
  id,
  label: str,
  value: str,
  logoUrl: optStr,
  watched: z.boolean().optional(),
  watchedAt: optDt.optional(),
  atsProvider: optStr.optional(),
  atsToken: optStr.optional(),
  atsHost: optStr.optional(),
  websiteUrl: optStr.optional(),
  careersUrl: optStr.optional(),
  industry: optStr.optional(),
});
const JobTitle = z.object({ id, label: str, value: str });
const Location = z.object({
  id,
  label: str,
  value: str,
  stateProv: optStr,
  country: optStr,
});
const JobSource = z.object({ id, label: str, value: str });
const Tag = z.object({ id, label: str, value: str });
const ActivityType = z.object({
  id,
  label: str,
  value: str,
  description: optStr,
  createdAt: dt,
  updatedAt: dt,
});

const Profile = z.object({ id });

// fileMissing marks a row whose bytes were absent on disk at export time.
const File = z.object({
  id,
  fileName: str,
  filePath: str,
  fileType: str,
  uploadedAt: dt,
  fileMissing: z.boolean().optional(),
});

const Resume = z.object({
  id,
  profileId: id,
  title: str,
  createdAt: dt,
  updatedAt: dt,
  FileId: optId,
  reviewData: optStr,
});

const ContactInfo = z.object({
  id,
  createdAt: dt,
  updatedAt: dt,
  resumeId: id,
  firstName: str,
  lastName: str,
  headline: str,
  email: str,
  phone: str,
  address: optStr,
  url1: optStr,
  url1Label: optStr,
  url2: optStr,
  url2Label: optStr,
});

const Summary = z.object({ id, createdAt: dt, updatedAt: dt, content: str });

const ResumeSection = z.object({
  id,
  resumeId: id,
  sectionTitle: str,
  sectionType: str,
  summaryId: optId,
});

const WorkExperience = z.object({
  id,
  createdAt: dt,
  updatedAt: dt,
  companyId: id,
  jobTitleId: id,
  startDate: dt,
  endDate: optDt,
  description: str,
  locationId: id,
  resumeSectionId: optId,
});

const Education = z.object({
  id,
  createdAt: dt,
  updatedAt: dt,
  institution: str,
  degree: str,
  fieldOfStudy: str,
  startDate: dt,
  endDate: optDt,
  description: optStr,
  locationId: id,
  resumeSectionId: optId,
});

const LicenseOrCertification = z.object({
  id,
  title: str,
  organization: str,
  issueDate: optDt,
  expirationDate: optDt,
  credentialUrl: optStr,
  resumeSectionId: optId,
});

const OtherSection = z.object({
  id,
  createdAt: dt,
  updatedAt: dt,
  title: str,
  content: str,
  resumeSectionId: optId,
});

const Skill = z.object({
  id,
  createdAt: dt,
  updatedAt: dt,
  category: optStr,
  order: int,
  tagId: id,
  resumeSectionId: id,
});

const CoverLetter = z.object({
  id,
  profileId: id,
  title: str,
  content: str,
  createdAt: dt,
  updatedAt: dt,
});

const Automation = z.object({
  id,
  name: str,
  jobBoard: str,
  keywords: str,
  location: str,
  sourceConfig: optStr,
  resumeId: id,
  matchThreshold: int,
  scheduleHour: int,
  nextRunAt: optDt,
  lastRunAt: optDt,
  status: str,
  createdAt: dt,
  updatedAt: dt,
});

const Job = z.object({
  id,
  jobUrl: optStr,
  description: str,
  jobType: str,
  workplaceType: optStr,
  createdAt: dt,
  applied: z.boolean(),
  appliedDate: optDt,
  dueDate: optDt,
  // The instance-local statusId is replaced by the stable natural key.
  statusValue: str,
  jobTitleId: id,
  companyId: id,
  jobSourceId: optId,
  salaryRange: optStr,
  locationId: optId,
  resumeId: optId,
  coverLetterId: optId,
  automationId: optId,
  matchScore: optInt,
  matchData: optStr,
  discoveryStatus: optStr,
  discoveredAt: optDt,
  createdVia: optStr,
  descriptionCompleteness: optStr,
});

const Note = z.object({
  id,
  jobId: id,
  content: str,
  createdAt: dt,
  updatedAt: dt,
});

const Interview = z.object({ id, createdAt: dt, jobId: id });

// Everything past `interviewId` is `.optional()` as well as nullable: a backup
// taken before the contacts feature has no such key, and undefined leaves
// Prisma on the column default.
const Contact = z.object({
  id,
  name: str,
  email: optStr,
  createdAt: dt,
  interviewId: optId,
  title: optStr.optional(),
  phone: optStr.optional(),
  linkedinUrl: optStr.optional(),
  companyId: optId.optional(),
  locationId: optId.optional(),
  relationship: optStr.optional(),
  workedAtCompanyId: optId.optional(),
  workedFrom: optDt.optional(),
  workedTo: optDt.optional(),
  roleId: optId.optional(),
  notes: optStr.optional(),
  lastContactedAt: optDt.optional(),
  updatedAt: dt.optional(),
});

const ContactRole = z.object({ id, label: str, value: str });

const JobContact = z.object({
  id,
  jobId: id,
  contactId: id,
  roleId: id,
  createdAt: dt,
});

const Task = z.object({
  id,
  title: str,
  description: optStr,
  status: str,
  priority: int,
  percentComplete: int,
  dueDate: optDt,
  activityTypeId: optId,
  createdAt: dt,
  updatedAt: dt,
});

const Activity = z.object({
  id,
  activityName: str,
  startTime: dt,
  endTime: optDt,
  duration: optInt,
  breakMinutes: int,
  breakStartedAt: optDt,
  breakPlannedMins: optInt,
  description: optStr,
  createdAt: dt,
  updatedAt: dt,
  activityTypeId: id,
  taskId: optId,
});

const Question = z.object({
  id,
  question: str,
  answer: optStr,
  createdAt: dt,
  updatedAt: dt,
  createdVia: optStr,
});

const AutomationRun = z.object({
  id,
  automationId: id,
  jobsSearched: int,
  jobsDeduplicated: int,
  jobsProcessed: int,
  jobsMatched: int,
  jobsSaved: int,
  status: str,
  errorMessage: optStr,
  blockedReason: optStr,
  funnelStats: optStr,
  startedAt: dt,
  completedAt: optDt,
});

const UserSettings = z.object({
  id,
  settings: str,
  createdAt: dt,
  updatedAt: dt,
});

const group = <T extends z.ZodTypeAny>(schema: T) =>
  z.array(schema).default([]);

export const BackupDataSchema = z.object({
  Company: group(Company),
  JobTitle: group(JobTitle),
  Location: group(Location),
  JobSource: group(JobSource),
  Tag: group(Tag),
  ActivityType: group(ActivityType),
  ContactRole: group(ContactRole),
  Profile: group(Profile),
  File: group(File),
  Resume: group(Resume),
  ContactInfo: group(ContactInfo),
  Summary: group(Summary),
  ResumeSection: group(ResumeSection),
  WorkExperience: group(WorkExperience),
  Education: group(Education),
  LicenseOrCertification: group(LicenseOrCertification),
  OtherSection: group(OtherSection),
  Skill: group(Skill),
  CoverLetter: group(CoverLetter),
  Automation: group(Automation),
  Job: group(Job),
  Note: group(Note),
  Interview: group(Interview),
  Contact: group(Contact),
  JobContact: group(JobContact),
  Task: group(Task),
  Activity: group(Activity),
  Question: group(Question),
  AutomationRun: group(AutomationRun),
  UserSettings: group(UserSettings),

  // Implicit Prisma m2m relations are not models, so they travel as id pairs.
  _JobToTag: group(z.object({ jobId: id, tagId: id })),
  _QuestionToTag: group(z.object({ questionId: id, tagId: id })),

  // Natural keys for the only global table in the schema.
  jobStatuses: group(z.object({ label: str, value: str })),

  // The only User field that travels; applied after Resume rows exist.
  user: z
    .object({ defaultResumeId: optId })
    .default({ defaultResumeId: null }),
});

export type BackupData = z.infer<typeof BackupDataSchema>;
export type BackupRow = Record<string, unknown>;
