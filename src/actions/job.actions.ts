// Barrel for the job server actions, split into src/actions/job/.
// Each module below carries its own "use server"; this file only re-exports so
// the long-standing "@/actions/job.actions" import path keeps working.

export {
  getJobsList,
  getJobFilterCounts,
  getJobsIterator,
  getJobDetails,
} from "./job/queries";

export { addJob, updateJob, deleteJobById } from "./job/mutations";

export { updateJobStatus, saveJobMatchResult } from "./job/status";

export {
  getStatusList,
  getJobSourceList,
  createLocation,
  createJobSource,
} from "./job/references";
