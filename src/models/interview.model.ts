import type { JobStage } from "./jobStage.model";

// Undated rounds count as upcoming: an unscheduled interview is work still
// ahead, and it is the row most easily forgotten.
export const INTERVIEW_VIEWS = ["upcoming", "past", "all"] as const;

export type InterviewView = (typeof INTERVIEW_VIEWS)[number];

export interface InterviewRow extends JobStage {
  Job: {
    id: string;
    JobTitle: { label: string };
    Company: { id: string; label: string };
  };
}

export interface InterviewFilterOption {
  id: string;
  label: string;
}

export interface InterviewFilterOptions {
  rounds: InterviewFilterOption[];
  companies: InterviewFilterOption[];
}
