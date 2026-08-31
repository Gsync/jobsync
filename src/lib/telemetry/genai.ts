import type { LanguageModelUsage } from "ai";
import { CAPTURE_CONTENT } from "./config";
import type { Attrs } from "./otlp";

// The field you group by when comparing quality across surfaces. Fixed at six
// values — a seventh invented one silently splits a comparison.
export const SURFACES = {
  AGENT_CHAT: "agent.chat",
  RESUME_REVIEW: "resume.review",
  JOB_MATCH: "job.match",
  COVER_LETTER: "cover.letter",
  AUTOMATION_MATCH: "automation.match",
  RESUME_IMPORT: "resume.import",
} as const;

export type Surface = (typeof SURFACES)[keyof typeof SURFACES];

// Nested-tool labels are the runNestedGeneration argument; mapping them here
// keeps every surface decision in one file.
export const SURFACE_BY_NESTED_LABEL: Record<string, Surface> = {
  review_resume: SURFACES.RESUME_REVIEW,
  match_job: SURFACES.JOB_MATCH,
  generate_cover_letter: SURFACES.COVER_LETTER,
};

export function genAiRequestAttrs(input: {
  provider: string;
  model: string;
  temperature?: number;
  numCtx?: number;
  surface: Surface;
  system?: string;
  prompt?: unknown;
}): Attrs {
  const attrs: Attrs = {
    "gen_ai.system": input.provider,
    "gen_ai.request.model": input.model,
    "jobsync.surface": input.surface,
  };
  if (input.temperature !== undefined) {
    attrs["gen_ai.request.temperature"] = input.temperature;
  }
  // num_ctx is only interesting beside gen_ai.usage.input_tokens: Ollama drops
  // the oldest context on overflow with no error and no distinct finish
  // reason, so the pair is the only way overflow is visible at all.
  if (input.numCtx !== undefined) {
    attrs["jobsync.ollama.num_ctx"] = input.numCtx;
  }
  if (CAPTURE_CONTENT && (input.system !== undefined || input.prompt !== undefined)) {
    attrs["gen_ai.prompt"] = { system: input.system, prompt: input.prompt };
  }
  return attrs;
}

export function genAiResponseAttrs(input: {
  usage?: LanguageModelUsage;
  finishReason?: string;
  text?: string;
  toolCalls?: unknown;
}): Attrs {
  const attrs: Attrs = {};
  if (input.usage?.inputTokens !== undefined) {
    attrs["gen_ai.usage.input_tokens"] = input.usage.inputTokens;
  }
  if (input.usage?.outputTokens !== undefined) {
    attrs["gen_ai.usage.output_tokens"] = input.usage.outputTokens;
  }
  if (input.usage?.totalTokens !== undefined) {
    attrs["gen_ai.usage.total_tokens"] = input.usage.totalTokens;
  }
  if (input.finishReason !== undefined) {
    attrs["gen_ai.response.finish_reasons"] = input.finishReason;
  }
  if (CAPTURE_CONTENT && input.text !== undefined) {
    attrs["gen_ai.completion"] = input.text;
  }
  if (CAPTURE_CONTENT && input.toolCalls !== undefined) {
    attrs["gen_ai.response.tool_calls"] = input.toolCalls;
  }
  return attrs;
}

// truncated is read from the flag the call site already computes — this
// records that the APP clipped the model input, which is a different fact
// from otlp.ts's capped_attrs (telemetry clipped an exported attribute).
export function inputSizeAttrs(input: {
  resumeChars?: number;
  jobChars?: number;
  truncated?: boolean;
}): Attrs {
  const attrs: Attrs = {};
  if (input.resumeChars !== undefined) {
    attrs["jobsync.input.resume_chars"] = input.resumeChars;
  }
  if (input.jobChars !== undefined) {
    attrs["jobsync.input.job_chars"] = input.jobChars;
  }
  if (input.truncated !== undefined) {
    attrs["jobsync.input.truncated"] = input.truncated;
  }
  return attrs;
}
