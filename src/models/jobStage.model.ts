import { z } from "zod";
import type { Tag } from "./job.model";
import type { ContactSummary } from "./contact.model";
import { STAGE_OUTCOMES } from "@/lib/constants";

export interface JobStageTypeRef {
  id: string;
  label: string;
  value: string;
  statusId: string;
  sortOrder: number;
  Status?: { id: string; label: string; value: string };
  _count?: { stages: number };
}

export interface JobStageInterviewerLink {
  id: string;
  stageId: string;
  contactId: string;
  Contact: ContactSummary;
}

export interface JobStagePrepQuestionLink {
  id: string;
  stageId: string;
  questionId: string;
  asked: boolean;
  askedAt: Date | null;
  Question: { id: string; question: string; tags: Tag[] };
}

export interface JobStage {
  id: string;
  jobId: string;
  stageTypeId: string;
  occurredAt: Date | null;
  isCurrent: boolean;
  outcome: string | null;
  notes: string | null;
  durationMins: number | null;
  format: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
  StageType: JobStageTypeRef;
  interviewers: JobStageInterviewerLink[];
  prepQuestions: JobStagePrepQuestionLink[];
}

const outcomeValues = STAGE_OUTCOMES.map((o) => o.value) as unknown as [
  string,
  ...string[],
];

// Either an existing type id or a custom name, never neither. A custom name
// also needs its parent status, which the dialog asks for in the same pass.
export const AddJobStageFormSchema = z
  .object({
    id: z.string().optional(),
    jobId: z.string().min(1),
    stageTypeId: z.string().optional(),
    customLabel: z.string().max(80).optional(),
    customStatusId: z.string().optional(),
    date: z.date().nullable().optional(),
    time: z.string().optional(),
    notes: z.string().max(2000).optional(),
    outcome: z.enum(outcomeValues).nullable().optional(),
    durationMins: z.number().int().positive().max(1440).nullable().optional(),
    format: z.string().max(60).optional(),
    location: z.string().max(200).optional(),
    setAsCurrent: z.boolean().default(true),
  })
  .refine((data) => !!data.stageTypeId || !!data.customLabel?.trim(), {
    message: "Pick a stage or enter a custom stage name.",
    path: ["stageTypeId"],
  })
  .refine(
    (data) => !data.customLabel?.trim() || !!data.customStatusId,
    { message: "Pick the status this custom stage means.", path: ["customStatusId"] },
  );

export type AddJobStageValues = z.infer<typeof AddJobStageFormSchema>;
