import type { FindingKey } from "../security/exceptions";

// Every entry must match exactly one current finding and explain why.
export type InvariantException = FindingKey & { reason: string };

export const STATUS_WRITE_EXCEPTIONS: InvariantException[] = [
  {
    file: "src/actions/mock.actions.ts",
    target: "generateMockJobsAction:job.create#1",
    check: "unresolved-data",
    reason: "Mock jobs keep generated applied dates and seed the matching stage with initialTimelineForNewJob",
  },
  {
    file: "src/lib/backup/importRows.ts",
    target: "insertLookups:tx[spec.delegate].create#1",
    check: "unresolved-call",
    reason: "Restoring a JobStageType remaps its parent status by value",
  },
  {
    file: "src/lib/backup/importRows.ts",
    target: "insertLookups:tx[spec.delegate].create#2",
    check: "unresolved-call",
    reason: "The remaining lookup delegates restore user vocabulary and have no job status",
  },
  {
    file: "src/lib/backup/importRows.ts",
    target: "insertRows:tx[spec.delegate].create#1",
    check: "unresolved-call",
    reason: "Backup import restores the saved job status and stages to preserve the original timeline",
  },
  {
    file: "src/lib/jobs/createJobRecord.ts",
    target: "createJobRecord:job.create#1",
    check: "unresolved-data",
    reason: "New jobs use the stages and job fields returned by initialTimelineForNewJob",
  },
  {
    file: "src/lib/jobs/updateJobFromNames.ts",
    target: "updateJobFromNames:job.update#1",
    check: "unresolved-data",
    reason: "Status changes use changeJobStatus. MCP can update applied and appliedDate independently when status stays the same",
  },
  {
    file: "src/lib/scraper/automation-run/persist.ts",
    target: "persistDiscoveredJob:job.create#1",
    check: "unresolved-data",
    reason: "Discovered jobs use the stages and job fields returned by initialTimelineForNewJob",
  },
];

export const RESOLVER_TX_EXCEPTIONS: InvariantException[] = [];

export const STAGE_ORDER_EXCEPTIONS: InvariantException[] = [
  {
    file: "src/actions/interview.actions.ts",
    target: "getInterviewList:jobStage.findMany#1",
    check: "stage-order-by",
    reason: "Interviews list is server-paged across jobs and ordered by date, not one job's timeline order",
  },
];
