import type { DescriptionCompleteness } from "@/models/job.model";

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

export const AGENT_CHAT_TOOL_NAMES = ["add_job", "get_resume"] as const;
export type AgentChatToolName = (typeof AGENT_CHAT_TOOL_NAMES)[number];
