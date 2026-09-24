import type { JobStage } from "./jobStage.model";

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
