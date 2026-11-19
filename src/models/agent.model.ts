import type { DescriptionCompleteness } from "@/models/job.model";
import type { JobMatchScores, ResumeScores } from "@/models/ai.schemas";

// Dependency-free by design: client components import these types, so nothing
// here may pull in Prisma or server-only code. Type-only imports are erased.

export type PageContext = {
  route?: string;
  jobId?: string;
  resumeId?: string;
};

// Custom data part, not a FileUIPart: a file part is a standard type that
// convertToModelMessages would carry to the model in full, defeating head
// truncation. Data parts are dropped, which is why the head is injected.
export const AGENT_PASTE_PART_TYPE = "data-paste";

export type AgentPastePartData = {
  id: string;
  text: string;
  chars: number;
  truncated: boolean;
  consumed?: boolean;
};

export type AgentPastePart = {
  type: typeof AGENT_PASTE_PART_TYPE;
  id?: string;
  data: AgentPastePartData;
};

export function isAgentPastePart(part: unknown): part is AgentPastePart {
  const candidate = part as AgentPastePart | undefined;
  return (
    !!candidate &&
    candidate.type === AGENT_PASTE_PART_TYPE &&
    typeof candidate.data?.text === "string"
  );
}

export type AgentResolvedEntity = {
  id: string;
  label: string;
  created: boolean;
};

// What add_job returns to the model AND to the result card. The card composes
// its own copy from these fields — never from createJobFromNames' message,
// which is MCP-facing protocol text naming tools the chat does not expose.
export type AgentAddJobResult = {
  created: boolean;
  jobId?: string;
  duplicateOf?: { id: string; title: string; company: string };
  resolutions: AgentResolvedEntity[];
  descriptionSource?: "pasted" | "model" | "scraped";
  descriptionChars?: number;
  descriptionCompleteness?: DescriptionCompleteness;
  validationError?: string;
  // The card renders validationError verbatim, so a recovery instruction
  // written at the model reaches the user as prose about itself. Set this
  // wherever the two audiences need different words; Zod's own messages name
  // the field and its values and read fine unaided, so they leave it unset.
  displayError?: string;
};

// What scrape_job returns to the model AND to the result card. jobDescription
// is the page's text, capped for the model window; add_job re-reads the URL
// (from the short-lived cache) and stores the full version.
export type AgentScrapeJobResult =
  | {
      status: "ok";
      jobUrl: string;
      company: string;
      jobTitle: string;
      jobDescription: string;
      descriptionChars: number;
      descriptionCompleteness: DescriptionCompleteness;
      descriptionTruncated: boolean;
      structuredData: boolean;
      location?: string;
      source?: string;
      jobType?: string;
      workplaceType?: string;
      salaryRange?: string;
      postedDate?: string;
      tags?: string[];
      warnings?: string[];
    }
  | {
      status: "invalid_url" | "blocked" | "fetch_failed" | "not_job_posting" | "too_large";
      reason: string;
    };

// Which rule picked the resume. Surfaced so the result card can say "your
// default resume" instead of leaving the user guessing which one was read.
export type AgentResumeSource = "named" | "page" | "default" | "only";

// What get_resume returns to the model AND to the result card. resumeText is
// the only large field; the card must never render it.
export type AgentGetResumeResult =
  | {
      status: "ok";
      resumeId: string;
      title: string;
      resumeText: string;
      chars: number;
      truncated: boolean;
      source: AgentResumeSource;
      ambiguousTitle?: boolean;
    }
  | { status: "needs_selection"; resumes: { id: string; title: string }[] }
  | { status: "no_resumes" }
  | { status: "unreadable"; title: string; reason: string };

// Transient stream part carrying a nested generation's tokens. It is never
// persisted: the finished artifact lands in the tool result, and keeping both
// would duplicate it in storage and in model context. Shared by review_resume
// and match_job — the toolCallId key is what keeps two of them apart.
export const AGENT_NESTED_STREAM_PART_TYPE = "data-nested-stream";

export type AgentNestedStreamData = { delta: string };

// What review_resume returns to the model AND to the result card. The resume
// text is deliberately absent — follow-ups answer from `body`, not from the
// serialization.
export type AgentReviewResumeResult =
  | {
      status: "ok";
      resumeId: string;
      title: string;
      scores: ResumeScores;
      body: string;
      saved: boolean;
      saveError?: string;
    }
  | { status: "needs_selection"; resumes: { id: string; title: string }[] }
  | { status: "no_resumes" }
  | { status: "unreadable"; title: string; reason: string }
  | { status: "generation_failed"; title: string; reason: string };

// What match_job returns to the model AND to the result card. Neither the
// resume text nor the job description is here — follow-ups answer from `body`.
export type AgentMatchJobResult =
  | {
      status: "ok";
      jobId: string;
      jobTitle: string;
      company: string;
      resumeId: string;
      resumeTitle: string;
      scores: JobMatchScores;
      body: string;
      saved: boolean;
      saveError?: string;
    }
  | { status: "no_job" }
  | { status: "needs_selection"; resumes: { id: string; title: string }[] }
  | { status: "no_resumes" }
  | { status: "unreadable"; what: "job" | "resume"; title: string; reason: string }
  | { status: "generation_failed"; jobTitle: string; reason: string };

// What generate_cover_letter returns to the model AND to the result card. The
// letter body is here so a follow-up ("make it shorter") answers from it; the
// resume text and the job description are not.
export type AgentCoverLetterResult =
  | {
      status: "ok";
      jobId: string;
      jobTitle: string;
      company: string;
      resumeId: string;
      resumeTitle: string;
      body: string;
      coverLetterId?: string;
      coverLetterTitle?: string;
      saved: boolean;
      saveError?: string;
    }
  | { status: "no_job" }
  | { status: "no_description"; jobTitle: string }
  | { status: "needs_selection"; resumes: { id: string; title: string }[] }
  | { status: "no_resumes" }
  | { status: "unreadable"; what: "job" | "resume"; title: string; reason: string }
  | { status: "generation_failed"; jobTitle: string; reason: string };

// Tools that run their own generation and stream it as transient parts. The
// transcript and the provider both branch on this rather than on a chain of
// name comparisons that grows with every nested tool.
export const AGENT_NESTED_TOOLS = [
  "review_resume",
  "match_job",
  "generate_cover_letter",
] as const;

export function isNestedTool(name: string): boolean {
  return (AGENT_NESTED_TOOLS as readonly string[]).includes(name);
}

// Tools that end the turn. The result card renders deterministically from
// structured fields, so a second generation just to narrate it is 10-30s of
// local inference for a sentence that could be wrong. A tool that runs its
// own generation MUST be listed here or a single turn can chain two of them
// and blow the turn timeout, discarding both.
export const AGENT_CHAT_TERMINAL_TOOLS = [
  "add_job",
  ...AGENT_NESTED_TOOLS,
] as const;

// add_job is terminal once it has SETTLED — written, hit a duplicate, or
// asked for approval — not merely once it has been called. A call that cannot
// write skips approval and so fails inside the same step that made it, and
// hasToolCall would end the turn on the one step the model needs to retry in,
// leaving the user a red card and no answer.
export function addJobSettled(step: {
  toolCalls?: readonly { toolName: string; invalid?: boolean }[];
  toolResults?: readonly { toolName: string; output?: unknown }[];
}): boolean {
  const call = step.toolCalls?.find((c) => c.toolName === "add_job");
  if (!call) return false;
  // A call whose input failed the tool's own schema never reaches execute:
  // the SDK marks it invalid and emits a tool-error, so it produces no
  // tool-result and would otherwise read as a pending approval below. It is
  // the same retryable failure as a validationError, one layer up.
  if (call.invalid) return false;
  const result = step.toolResults?.find((r) => r.toolName === "add_job");
  // No result yet means the call is waiting on the approval card, and nothing
  // more can happen this turn.
  if (!result) return true;
  return !(result.output as AgentAddJobResult | undefined)?.validationError;
}
