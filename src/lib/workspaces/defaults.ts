import type { WorkspaceType } from "@prisma/client";

export const ACTIVE_WORKSPACE_COOKIE = "activeWorkspaceId";

// Default pipeline stages per workspace type (PRD §4). Editable in Settings later.
export const DEFAULT_STAGES: Record<WorkspaceType, { name: string; isTerminal?: boolean; color?: string }[]> = {
  SCHOOL: [
    { name: "Researching", color: "#64748b" },
    { name: "Outreach sent", color: "#0284c7" },
    { name: "Applied", color: "#7c3aed" },
    { name: "Interview", color: "#d97706" },
    { name: "Offer", color: "#059669" },
    { name: "Rejected / Withdrawn", isTerminal: true, color: "#dc2626" },
  ],
  JOB: [
    { name: "Saved", color: "#64748b" },
    { name: "Applied", color: "#0284c7" },
    { name: "Screening", color: "#7c3aed" },
    { name: "Interview", color: "#d97706" },
    { name: "Offer", color: "#059669" },
    { name: "Rejected / Withdrawn", isTerminal: true, color: "#dc2626" },
  ],
};

export function defaultStagesFor(type: WorkspaceType) {
  return DEFAULT_STAGES[type].map((s, i) => ({ ...s, order: i + 1 }));
}
