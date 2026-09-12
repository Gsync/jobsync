// The single table that drives export scoping, wipe scoping, FK rewriting and
// ownership injection. A second list of models anywhere is a bug waiting to
// happen — everything reads this one.

export type BackupModel =
  | "Company"
  | "JobTitle"
  | "Location"
  | "JobSource"
  | "Tag"
  | "ActivityType"
  | "Profile"
  | "File"
  | "Resume"
  | "ContactInfo"
  | "Summary"
  | "ResumeSection"
  | "WorkExperience"
  | "Education"
  | "LicenseOrCertification"
  | "OtherSection"
  | "Skill"
  | "CoverLetter"
  | "Automation"
  | "Job"
  | "Note"
  | "Interview"
  | "Contact"
  | "ContactRole"
  | "JobContact"
  | "Task"
  | "Activity"
  | "Question"
  | "AutomationRun"
  | "UserSettings";

export interface ModelSpec {
  // Prisma client delegate key, e.g. prisma[spec.delegate].findMany(...)
  delegate: string;
  // Ownership column written from the session user, never read from the file.
  owner?: "userId" | "createdBy";
  // Resolved by (value, createdBy) upsert rather than minted fresh.
  lookup?: boolean;
  // Foreign-key column -> the model whose ids it points at.
  fks: Record<string, BackupModel>;
  // Ownership-scoped where clause, per CLAUDE.md's IDOR rules.
  scope: (userId: string) => Record<string, unknown>;
}

const byUser = (userId: string) => ({ userId });
const byCreatedBy = (userId: string) => ({ createdBy: userId });
const byProfile = (userId: string) => ({ profile: { userId } });
const byResume = (userId: string) => ({ Resume: { profile: { userId } } });
const bySection = (userId: string) => ({
  ResumeSection: { Resume: { profile: { userId } } },
});

export const MODEL_SPECS: Record<BackupModel, ModelSpec> = {
  Company: { delegate: "company", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },
  JobTitle: { delegate: "jobTitle", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },
  Location: { delegate: "location", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },
  JobSource: { delegate: "jobSource", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },
  Tag: { delegate: "tag", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },
  ActivityType: { delegate: "activityType", owner: "createdBy", lookup: true, fks: {}, scope: byCreatedBy },

  Profile: { delegate: "profile", owner: "userId", fks: {}, scope: byUser },

  // File holds no foreign key — Resume.FileId points at it — so it is scoped
  // through the back-relation, matching deleteFile in profile.actions.ts.
  File: { delegate: "file", fks: {}, scope: byResume },

  Resume: {
    delegate: "resume",
    fks: { profileId: "Profile", FileId: "File" },
    scope: byProfile,
  },

  // ContactInfo hangs off Resume, not ResumeSection: resumeId @unique, and the
  // relation field is lower-case `resume` unlike ResumeSection's `Resume`.
  ContactInfo: { delegate: "contactInfo", fks: { resumeId: "Resume" }, scope: (userId) => ({ resume: { profile: { userId } } }) },

  // Summary holds no foreign key either — ResumeSection.summaryId points at it.
  Summary: { delegate: "summary", fks: {}, scope: bySection },

  ResumeSection: {
    delegate: "resumeSection",
    fks: { resumeId: "Resume", summaryId: "Summary" },
    scope: byResume,
  },
  WorkExperience: {
    delegate: "workExperience",
    fks: {
      companyId: "Company",
      jobTitleId: "JobTitle",
      locationId: "Location",
      resumeSectionId: "ResumeSection",
    },
    scope: bySection,
  },
  Education: {
    delegate: "education",
    fks: { locationId: "Location", resumeSectionId: "ResumeSection" },
    scope: bySection,
  },
  LicenseOrCertification: {
    delegate: "licenseOrCertification",
    fks: { resumeSectionId: "ResumeSection" },
    scope: bySection,
  },
  OtherSection: {
    delegate: "otherSection",
    fks: { resumeSectionId: "ResumeSection" },
    scope: bySection,
  },
  Skill: {
    delegate: "skill",
    fks: { tagId: "Tag", resumeSectionId: "ResumeSection" },
    scope: bySection,
  },
  CoverLetter: { delegate: "coverLetter", fks: { profileId: "Profile" }, scope: byProfile },
  Automation: {
    delegate: "automation",
    owner: "userId",
    fks: { resumeId: "Resume" },
    scope: byUser,
  },
  Job: {
    delegate: "job",
    owner: "userId",
    fks: {
      jobTitleId: "JobTitle",
      companyId: "Company",
      jobSourceId: "JobSource",
      locationId: "Location",
      resumeId: "Resume",
      coverLetterId: "CoverLetter",
      automationId: "Automation",
    },
    scope: byUser,
  },
  Note: { delegate: "note", owner: "userId", fks: { jobId: "Job" }, scope: byUser },
  Interview: { delegate: "interview", fks: { jobId: "Job" }, scope: (userId) => ({ job: { userId } }) },
  Contact: {
    delegate: "contact",
    owner: "createdBy",
    fks: {
      interviewId: "Interview",
      companyId: "Company",
      locationId: "Location",
      workedAtCompanyId: "Company",
      roleId: "ContactRole",
    },
    scope: byCreatedBy,
  },
  // A lookup like every other (value, createdBy) reference table, so a restore
  // into an account that already has the seeded roles does not double them.
  ContactRole: {
    delegate: "contactRole",
    owner: "createdBy",
    lookup: true,
    fks: {},
    scope: byCreatedBy,
  },
  JobContact: {
    delegate: "jobContact",
    fks: { jobId: "Job", contactId: "Contact", roleId: "ContactRole" },
    scope: (userId) => ({ Job: { userId } }),
  },
  Task: {
    delegate: "task",
    owner: "userId",
    fks: { activityTypeId: "ActivityType" },
    scope: byUser,
  },
  Activity: {
    delegate: "activity",
    owner: "userId",
    fks: { activityTypeId: "ActivityType", taskId: "Task" },
    scope: byUser,
  },
  Question: { delegate: "question", owner: "createdBy", fks: {}, scope: byCreatedBy },
  AutomationRun: {
    delegate: "automationRun",
    fks: { automationId: "Automation" },
    scope: (userId) => ({ automation: { userId } }),
  },
  UserSettings: { delegate: "userSettings", owner: "userId", fks: {}, scope: byUser },
};

export const INSERT_ORDER: BackupModel[] = [
  "Company",
  "JobTitle",
  "Location",
  "JobSource",
  "Tag",
  "ActivityType",
  "ContactRole",
  "Profile",
  "File",
  "Resume",
  "ContactInfo",
  "Summary",
  "ResumeSection",
  "WorkExperience",
  "Education",
  "LicenseOrCertification",
  "OtherSection",
  "Skill",
  "CoverLetter",
  "Automation",
  "Job",
  "Note",
  "Interview",
  "Contact",
  "JobContact",
  "Task",
  "Activity",
  "Question",
  "AutomationRun",
  "UserSettings",
];

export const DELETE_ORDER: BackupModel[] = [...INSERT_ORDER].reverse();

export const LOOKUP_MODELS: BackupModel[] = INSERT_ORDER.filter(
  (m) => MODEL_SPECS[m].lookup,
);

// signup() seeds a JobSource per JOB_SOURCES entry, so no account is ever
// literally empty. Counting content models only keeps the destructive
// confirmation meaningful on a fresh instance. Profile is in the list because
// reads use findFirst — a second profile is a silent coin flip, not an error.
export const EMPTINESS_MODELS: BackupModel[] = [
  "Profile",
  "Resume",
  "CoverLetter",
  "Job",
  "Note",
  "Task",
  "Activity",
  "Question",
  "Automation",
];
