// Reviewed exceptions for the static security guardrails. Every entry must
// match exactly one current finding, so a stale entry fails its spec.
// When an edit shifts an ordinal, re-review the call now at it before renumbering.

export type ExceptionCategory = "public" | "alternate-auth" | "contract-exception" | "known-gap";

export interface FindingKey {
  file: string;
  target: string;
  check: string;
}

export interface SecurityException extends FindingKey {
  category: ExceptionCategory;
  reason: string;
  issue?: string;
}

const sameFinding = (a: FindingKey, b: FindingKey) =>
  a.file === b.file && a.target === b.target && a.check === b.check;

export function applyExceptions<F extends FindingKey>(
  findings: F[],
  exceptions: SecurityException[],
) {
  const unexcepted = findings.filter((f) => !exceptions.some((e) => sameFinding(e, f)));
  const stale = exceptions
    .map((exception) => ({
      exception,
      matches: findings.filter((f) => sameFinding(exception, f)).length,
    }))
    .filter(({ matches }) => matches !== 1);
  return { unexcepted, stale };
}

const MODEL_ROUTE_GAP = "docs/issues/api-model-route-auth-guards.md";
const NEXTAUTH = "src/app/api/auth/[...nextauth]/route.ts";
const MCP = "src/app/api/mcp/route.ts";

export const ROUTE_EXCEPTIONS: SecurityException[] = [
  ...["openai", "gemini", "deepseek"].map((provider) => ({
    file: `src/app/api/ai/${provider}/models/route.ts`,
    target: "GET",
    check: "status-401",
    category: "known-gap" as const,
    reason: "Reads the session but never rejects an absent one",
    issue: MODEL_ROUTE_GAP,
  })),
  {
    file: "src/app/api/automations/[id]/logs/route.ts",
    target: "GET",
    check: "status-401",
    category: "contract-exception",
    reason: "SSE stream rejects an absent session with an error frame, status 200",
  },
  ...["GET", "POST"].map((target) => ({
    file: NEXTAUTH,
    target,
    check: "unresolved-handler",
    category: "public" as const,
    reason: "NextAuth's own sign-in and session handlers",
  })),
  {
    file: NEXTAUTH,
    target: "/api/auth/test/path",
    check: "proxy-coverage",
    category: "public",
    reason: "Proxy matcher excludes /api/auth so sign-in stays reachable",
  },
  ...["POST", "DELETE"].map((target) => ({
    file: MCP,
    target,
    check: "auth-call",
    category: "alternate-auth" as const,
    reason: "PAT auth through resolveMcpToken (src/lib/mcp/auth.ts)",
  })),
  {
    file: MCP,
    target: "GET",
    check: "auth-call",
    category: "alternate-auth",
    reason: "Returns 405 without touching data; POST/DELETE carry PAT auth",
  },
  {
    file: MCP,
    target: "/api/mcp",
    check: "proxy-coverage",
    category: "alternate-auth",
    reason: "Proxy matcher excludes /api/mcp; the route checks its own PAT",
  },
];

// Models with no owner, exempt from the ownership check by delegate name.
export const GLOBAL_MODELS: { model: string; reason: string }[] = [
  { model: "jobStatus", reason: "Seeded reference statuses shared by every user" },
];

const DEGRADE = "Documented getCurrentUser() degrade: returns empty/null without a session";

const OWNER_FIRST = "where starts from the session owner key; later keys only narrow it";
const VERIFIED = "Id was verified by an owner-scoped lookup earlier in the function";
const OWNED_PARENT = "Children of a parent the function already verified as owned";
const COLLECTED = "Ids collected by an owner-scoped query in the same function";
const IN_USE = "docs/issues/delete-in-use-counts-unscoped.md";

// One entry per `function:model.operation#ordinal` target in a file.
const calls = (
  file: string,
  check: string,
  category: SecurityException["category"],
  reason: string,
  targets: string[],
  issue?: string,
): SecurityException[] =>
  targets.map((target) => ({ file: `src/actions/${file}`, target, check, category, reason, issue }));

const ownerFirst = (file: string, targets: string[]) =>
  calls(file, "unresolved-where", "contract-exception", OWNER_FIRST, targets);
const unscoped = (file: string, reason: string, targets: string[]) =>
  calls(file, "owner-filter", "contract-exception", reason, targets);

const LIST_QUERY_EXCEPTIONS = [
  ...ownerFirst("activity/activities.ts", ["getActivitiesList:activity.findMany#1", "getActivitiesList:activity.count#1"]),
  ...ownerFirst("automation/discoveredJobs.ts", ["getDiscoveredJobs:job.findMany#1", "getDiscoveredJobs:job.count#1", "getDiscoveredJobs:job.groupBy#1"]),
  ...ownerFirst("company/watch.ts", ["getWatchedBoards:company.findMany#1"]),
  ...ownerFirst("contact/queries.ts", ["getContactList:contact.findMany#1", "getContactList:contact.count#1"]),
  ...ownerFirst("contactRole.actions.ts", ["getContactRoleList:contactRole.findMany#1", "getContactRoleList:contactRole.count#1"]),
  ...ownerFirst("interview.actions.ts", [
    "getInterviewList:jobStage.count#1",
    "getInterviewList:jobStage.count#2",
    "getInterviewList:jobStage.findMany#1",
    "getInterviewList:jobStage.findMany#2",
  ]),
  ...ownerFirst("job/queries.ts", [
    "getJobFilterCounts:job.count#1",
    "getJobFilterCounts:job.groupBy#1",
    "getJobFilterCounts:job.count#2",
    "getJobsIterator:job.findMany#1",
  ]),
  ...ownerFirst("jobStageType.actions.ts", ["getJobStageTypeList:jobStageType.findMany#1", "getJobStageTypeList:jobStageType.count#1"]),
  ...ownerFirst("mock.actions.ts", ["clearAllDataAction:file.findMany#1"]),
  ...ownerFirst("notification.actions.ts", [
    "getNotificationList:notification.findMany#1",
    ...[1, 2, 3, 4, 5].map((n) => `getNotificationList:notification.count#${n}`),
  ]),
  ...ownerFirst("question.actions.ts", [
    "getQuestionsList:question.findMany#1",
    "getQuestionsList:question.count#1",
    "getTagsWithQuestionCounts:question.count#1",
  ]),
  ...ownerFirst("tag.actions.ts", ["getTagList:tag.findMany#1", "getTagList:tag.count#1"]),
  ...ownerFirst("task/queries.ts", ["getTasksList:task.findMany#1", "getTasksList:task.count#1"]),
  ...calls("referenceList.ts", "unresolved-call", "contract-exception",
    "Delegate passed in by the four list actions with the session user.id; extraWhere is at most { watched: true }",
    ["getReferenceEntityList:model.findMany#1", "getReferenceEntityList:model.count#1"]),
];

const VERIFIED_ID_EXCEPTIONS = [
  ...unscoped("automation/discoveredJobs.ts", VERIFIED, ["setDiscoveredJobStatus:job.update#1"]),
  ...unscoped("automation/mutations.ts", VERIFIED, [
    "updateAutomation:automation.update#1",
    "deleteAutomation:automation.delete#1",
    "pauseAutomation:automation.update#1",
    "resumeAutomation:automation.update#1",
  ]),
  ...unscoped("automation/runs.ts", VERIFIED, [
    "getAutomationRuns:automationRun.findMany#1",
    "getAutomationRuns:automationRun.count#1",
    "deleteAutomationRun:automationRun.delete#1",
  ]),
  ...unscoped("jobStage/interviewers.ts", VERIFIED, ["linkStageInterviewer:jobContact.findFirst#1"]),
  ...unscoped("jobStage/mutations.ts", VERIFIED, [
    "addJobStage:jobStage.findFirst#1",
    "updateJobStage:jobStageInterviewer.count#1",
    "updateJobStage:jobStagePrepQuestion.count#1",
    "updateJobStage:jobStage.update#1",
    "updateJobStage:jobStage.findFirst#1",
    "deleteJobStage:jobStage.delete#1",
    "deleteJobStage:jobStage.findMany#1",
  ]),
  ...unscoped("jobStage/prep.ts", VERIFIED, [
    "addStagePrepQuestions:jobStagePrepQuestion.findMany#1",
    "addStagePrepQuestions:jobStagePrepQuestion.findMany#2",
    "setPrepQuestionAsked:jobStagePrepQuestion.findFirst#1",
  ]),
  ...unscoped("profile/certification.ts", VERIFIED, [
    "addCertification:resumeSection.update#1",
    "deleteCertification:licenseOrCertification.delete#1",
    "deleteCertification:licenseOrCertification.count#1",
    "deleteCertification:resumeSection.delete#1",
  ]),
  ...unscoped("profile/education.ts", VERIFIED, ["addEducation:resumeSection.update#1"]),
  ...unscoped("profile/experience.ts", VERIFIED, ["addExperience:resumeSection.update#1"]),
  ...unscoped("profile/summary.ts", VERIFIED, ["addResumeSummary:resumeSection.update#1"]),
  ...unscoped("profile/files.ts", VERIFIED, ["deleteFile:file.delete#1"]),
  ...unscoped("profile/resumeUpload.ts", "File row of a resume the caller verified as owned", ["removeReplacedFile:file.delete#1"]),
  ...unscoped("profile/skills.ts", VERIFIED, [
    "updateSkillsSection:skill.deleteMany#1",
    "updateSkillsSection:resumeSection.update#1",
    "deleteSkillsSection:skill.deleteMany#1",
    "deleteSkillsSection:resumeSection.delete#1",
  ]),
  ...unscoped("profile/resume.ts", OWNED_PARENT, [
    "deleteResumeById:contactInfo.deleteMany#1",
    "deleteResumeById:summary.deleteMany#1",
    "deleteResumeById:workExperience.deleteMany#1",
    "deleteResumeById:education.deleteMany#1",
    "deleteResumeById:licenseOrCertification.deleteMany#1",
    "deleteResumeById:skill.deleteMany#1",
    "deleteResumeById:resumeSection.deleteMany#1",
  ]),
  ...unscoped("resumeImport/shared.ts", "resumeId asserted by resolveImportCard before any save", ["getOrCreateResumeSection:resumeSection.findFirst#1"]),
  ...unscoped("resumeImport/summary.ts", "resumeId asserted by resolveImportCard before any save", [
    "saveSummaryCard:resumeSection.findFirst#1",
    "saveSummaryCard:summary.update#1",
    "saveSummaryCard:resumeSection.update#1",
  ]),
  ...unscoped("company/mutations.ts", "Owner chain in OR with a null-section arm so unsectioned rows still block", [
    "deleteCompanyById:workExperience.count#1",
  ]),
  ...unscoped("mock.actions.ts", "profileId comes from the caller's own profile", ["generateMockProfileDataAction:resume.findFirst#1"]),
  ...unscoped("mock.actions.ts", COLLECTED, [
    "clearMockActivitiesAction:activity.deleteMany#1",
    ...["workExperience", "education", "licenseOrCertification", "otherSection", "resumeSection", "summary", "contactInfo", "resume"].map(
      (model) => `clearMockProfileDataAction:${model}.deleteMany#1`,
    ),
    "clearMockJobsAction:note.deleteMany#1",
    "clearMockJobsAction:job.update#1",
    "clearMockJobsAction:job.deleteMany#1",
  ]),
  ...calls("auth.actions.ts", "owner-filter", "public", "Duplicate-email check during sign-up", ["signup:user.findUnique#1"]),
];

const KNOWN_OWNERSHIP_GAPS = [
  ...calls("mock.actions.ts", "owner-filter", "known-gap", "Reads every user's activity types by value", [
    "generateMockActivitiesAction:activityType.findMany#1",
    "generateMockActivitiesAction:activityType.findMany#2",
  ], "docs/issues/mock-activity-types-cross-user.md"),
  ...calls("tag.actions.ts", "owner-filter", "known-gap", "In-use counts run before ownership is checked", [
    "deleteTagById:job.count#1",
    "deleteTagById:question.count#1",
    "deleteTagById:skill.count#1",
  ], IN_USE),
  ...calls("jobLocation.actions.ts", "owner-filter", "known-gap", "In-use counts are not owner-scoped", [
    "deleteJobLocationById:workExperience.count#1",
    "deleteJobLocationById:education.count#1",
  ], IN_USE),
  ...calls("jobtitle.actions.ts", "owner-filter", "known-gap", "In-use count is not owner-scoped", [
    "deleteJobTitleById:workExperience.count#1",
  ], IN_USE),
];

const requireUserException = (
  file: string,
  target: string,
  category: "public" | "contract-exception",
  reason: string,
): SecurityException => ({ file: `src/actions/${file}`, target, check: "require-user", category, reason });

export const ACTION_EXCEPTIONS: SecurityException[] = [
  requireUserException("auth.actions.ts", "signup", "public", "Account creation runs before a session exists"),
  requireUserException("auth.actions.ts", "authenticate", "public", "Sign-in runs before a session exists"),
  requireUserException("apiKey.actions.ts", "getOllamaBaseUrl", "contract-exception", DEGRADE),
  requireUserException("apiKey.actions.ts", "getDefaultOllamaBaseUrl", "contract-exception", "Returns the env default; reads no user data"),
  requireUserException("atsCompany.actions.ts", "searchAtsCompanies", "contract-exception", DEGRADE),
  requireUserException("atsCompany.actions.ts", "getAtsCompanyCount", "contract-exception", DEGRADE),
  requireUserException("atsCompany.actions.ts", "resolveAtsBoard", "contract-exception", DEGRADE),
  requireUserException("profile/contactInfo.ts", "getDefaultContactInfo", "contract-exception", DEGRADE),
  requireUserException("profile/defaultResume.ts", "getDefaultResumeId", "contract-exception", DEGRADE),
  requireUserException("job/references.ts", "getStatusList", "contract-exception", "Reads only the global JobStatus table"),
  requireUserException("profile/resume.ts", "createResumeProfile", "contract-exception", "Delegates to createResume (profile/resumeUpload.ts), which calls requireUser()"),
  {
    file: "src/actions/apiKey.actions.ts",
    target: "getOllamaBaseUrl:apiKey.findUnique#1",
    check: "owner-value",
    category: "known-gap",
    reason: "Client-callable action reads the ApiKey row of any userId passed in",
    issue: "docs/issues/get-ollama-base-url-client-user-id.md",
  },
  ...LIST_QUERY_EXCEPTIONS,
  ...VERIFIED_ID_EXCEPTIONS,
  ...KNOWN_OWNERSHIP_GAPS,
];
