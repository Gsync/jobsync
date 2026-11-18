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
import type {
  AgentAddJobResult,
  AgentCoverLetterResult,
  AgentGetResumeResult,
  AgentMatchJobResult,
  AgentReviewResumeResult,
} from "@/models/agent.model";

type AgentToolView = {
  Result: ComponentType<{ output: unknown; input: Record<string, unknown> }>;
  Approval?: ComponentType<{ input: Record<string, unknown>; pastedText?: string }>;
  Stream?: ComponentType<{ text: string }>;
};

export const AGENT_TOOL_VIEWS: Record<AgentToolName, AgentToolView> = {
  add_job: {
    Result: ({ output, input }) => <AddJobResult output={output as AgentAddJobResult} input={input} />,
    Approval: AddJobBody,
  },
  get_resume: {
    Result: ({ output }) => <GetResumeResult output={output as AgentGetResumeResult} />,
  },
  review_resume: {
    Result: ({ output }) => <ReviewResumeResult output={output as AgentReviewResumeResult} />,
    Stream: ReviewResumeStream,
  },
  match_job: {
    Result: ({ output }) => <MatchJobResult output={output as AgentMatchJobResult} />,
    Stream: MatchJobStream,
  },
  generate_cover_letter: {
    Result: ({ output }) => <CoverLetterResult output={output as AgentCoverLetterResult} />,
    Stream: CoverLetterStream,
  },
};
