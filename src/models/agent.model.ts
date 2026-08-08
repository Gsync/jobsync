import type { DescriptionCompleteness } from "@/models/job.model";
import type { ResumeScores } from "@/models/ai.schemas";

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
  descriptionSource?: "pasted" | "model";
  descriptionChars?: number;
  descriptionCompleteness?: DescriptionCompleteness;
  validationError?: string;
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

// Transient stream part carrying the nested review generation's tokens. It is
// never persisted: the finished review lands in the tool result, and keeping
// both would duplicate it in storage and in model context.
export const AGENT_REVIEW_PART_TYPE = "data-review";

export type AgentReviewStreamData = { delta: string };

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

// Tools that end the turn. The result card renders deterministically from
// structured fields, so a second generation just to narrate it is 10-30s of
// local inference for a sentence that could be wrong. A tool that runs its
// own generation MUST be listed here or a single turn can chain two of them
// and blow the turn timeout, discarding both.
export const AGENT_CHAT_TERMINAL_TOOLS = ["add_job", "review_resume"] as const;
