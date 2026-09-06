import type { JobBoard } from "@/models/automation.model";
import type { JobDetails } from "../types";

// `host` is optional and Lever-only (Greenhouse ignores it); it's persisted
// once a company is resolved so runtime fetches never re-probe regions.
export type AtsHost = "default" | "eu";

export interface AtsProvider {
  id: JobBoard;
  label: string; // display name shown in the wizard/detail UI
  // Fetch a watchlist with bounded concurrency + per-token isolation.
  search(
    companies: { name: string; token: string; host?: AtsHost }[],
  ): Promise<{
    jobs: JobDetails[];
    errors: { token: string; reason: string }[];
  }>;
}
