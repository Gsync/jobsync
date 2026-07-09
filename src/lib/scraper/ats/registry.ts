import type { JobBoard } from "@/models/automation.model";
import { searchGreenhouseJobs } from "../greenhouse";
import { searchLeverJobs } from "../lever";
import type { AtsProvider } from "./types";

// Server-only: imports the real network-calling search fns (fetch, p-limit).
// Never import this from client-bundled code — use isAtsBoard from
// automation.model.ts for the plain "is this board ATS-shaped" check.
export const ATS_PROVIDERS: Partial<Record<JobBoard, AtsProvider>> = {
  greenhouse: {
    id: "greenhouse",
    label: "Greenhouse",
    search: searchGreenhouseJobs,
  },
  lever: { id: "lever", label: "Lever", search: searchLeverJobs },
};
