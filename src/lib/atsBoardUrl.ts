import { APP_CONSTANTS } from "@/lib/constants";
import type { JobBoard, LeverHost } from "@/models/automation.model";

// Public job-board URL for a company. Lever's public posting host
// (jobs.lever.co / jobs.eu.lever.co) is region-specific and differs from its
// API host, so it's resolved from the company's persisted `host`.
export function companyBoardUrl(
  jobBoard: JobBoard,
  company: { token: string; host?: LeverHost },
): string {
  if (jobBoard === "lever") {
    const base =
      company.host === "eu"
        ? APP_CONSTANTS.LEVER_EU_JOB_URL
        : APP_CONSTANTS.LEVER_JOB_URL;
    return `${base}/${company.token}`;
  }
  return `${APP_CONSTANTS.GREENHOUSE_BOARD_URL}/${company.token}`;
}
