"use client";

import type { ComponentType } from "react";
import type { AgentToolName } from "@/lib/agent/registry";
import { AddJobBody } from "./AgentApprovalCard/AddJobBody";
import { CoverLetterStream, MatchJobStream, ReviewResumeStream } from "./AgentNestedStream";
import { AddJobResult } from "./AgentResultCard/AddJobResult";
import { GetResumeResult } from "./AgentResultCard/GetResumeResult";
import { ReviewResumeResult } from "./AgentResultCard/ReviewResumeResult";
import { MatchJobResult } from "./AgentResultCard/MatchJobResult";
import { CoverLetterResult } from "./AgentResultCard/CoverLetterResult";
import { AddQuestionResult } from "./AgentResultCard/AddQuestionResult";
import type {
  AgentAddJobResult,
  AgentAddQuestionResult,
  AgentCoverLetterResult,
  AgentGetResumeResult,
  AgentMatchJobResult,
  AgentReviewResumeResult,
} from "@/models/agent.model";

export type AgentToolOutcome = "ok" | "failed" | "timedOut" | "answer";

// answer: the tool stopped without breaking, and its card says why.
export function workflowOutcome(output: unknown): AgentToolOutcome {
  const result = output as {
    status?: string;
    saved?: boolean;
    busy?: true;
    timedOut?: true;
  };
  switch (result?.status) {
    case "ok":
      return result.saved ? "ok" : "failed";
    case "generation_failed":
      if (result.busy) return "answer";
      return result.timedOut ? "timedOut" : "failed";
    case "unreadable":
      return "failed";
    default:
      return "answer";
  }
}

function addJobOutcome(output: unknown): AgentToolOutcome {
  const result = output as AgentAddJobResult;
  if (result?.validationError) return "failed";
  return result?.duplicateOf ? "answer" : "ok";
}

const HELD_STATUSES: readonly string[] = ["exists", "similar", "invalid"];

function addQuestionOutcome(output: unknown): AgentToolOutcome {
  const result = output as AgentAddQuestionResult;
  if (result?.error) return "failed";
  const statuses = (result?.items ?? []).map((item) => item.status);
  if (statuses.some((status) => HELD_STATUSES.includes(status))) return "answer";
  return statuses.includes("failed") ? "failed" : "ok";
}

type AgentToolView = {
  Result: ComponentType<{ output: unknown; input: Record<string, unknown> }>;
  Approval?: ComponentType<{ input: Record<string, unknown>; pastedText?: string }>;
  Stream?: ComponentType<{ text: string }>;
  outcome?: (output: unknown) => AgentToolOutcome;
};

export const AGENT_TOOL_VIEWS: Record<AgentToolName, AgentToolView> = {
  add_job: {
    Result: ({ output, input }) => <AddJobResult output={output as AgentAddJobResult} input={input} />,
    Approval: AddJobBody,
    outcome: addJobOutcome,
  },
  get_resume: {
    Result: ({ output }) => <GetResumeResult output={output as AgentGetResumeResult} />,
  },
  review_resume: {
    Result: ({ output }) => <ReviewResumeResult output={output as AgentReviewResumeResult} />,
    Stream: ReviewResumeStream,
    outcome: workflowOutcome,
  },
  match_job: {
    Result: ({ output }) => <MatchJobResult output={output as AgentMatchJobResult} />,
    Stream: MatchJobStream,
    outcome: workflowOutcome,
  },
  generate_cover_letter: {
    Result: ({ output }) => <CoverLetterResult output={output as AgentCoverLetterResult} />,
    Stream: CoverLetterStream,
    outcome: workflowOutcome,
  },
  add_question: {
    Result: ({ output }) => <AddQuestionResult output={output as AgentAddQuestionResult} />,
    outcome: addQuestionOutcome,
  },
};
