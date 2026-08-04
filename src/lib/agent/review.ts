import { getToolName, isToolUIPart, type UIMessage } from "ai";
import { parseResumeReview } from "@/lib/ai/resumeReview/parse";
import type { AgentGetResumeResult } from "@/models/agent.model";
import type { ResumeScores } from "@/models/ai.schemas";

// Client-safe: no server-only, no Prisma. The provider calls this in
// onFinish and the tests call it directly.

export type PendingReviewSave = {
  resumeId: string;
  title: string;
  scores: ResumeScores;
  body: string;
};

function assistantText(message: UIMessage): string {
  return (message.parts ?? [])
    .filter((part) => part.type === "text")
    .map((part) => (part as { text: string }).text)
    .join("");
}

function readResultIn(
  message: UIMessage,
): { resumeId: string; title: string } | null {
  for (const part of message.parts ?? []) {
    if (!isToolUIPart(part)) continue;
    if (getToolName(part) !== "get_resume") continue;
    if (part.state !== "output-available") continue;
    const output = part.output as AgentGetResumeResult | undefined;
    if (output?.status === "ok") {
      return { resumeId: output.resumeId, title: output.title };
    }
  }
  return null;
}

/**
 * Saves only the FIRST scoring message after each successful get_resume. A
 * follow-up that happens to restate the scores must not replace a full saved
 * review; a deliberate redo re-reads the resume, which opens a new window.
 */
export function detectReviewSave(
  messages: UIMessage[],
  finished: UIMessage,
): PendingReviewSave | null {
  const { scores, body } = parseResumeReview(assistantText(finished));
  if (!scores) return null;

  // The route runs one streamText per turn, so a review's get_resume result
  // and its prose are parts of the SAME message. Check here before walking
  // back — a backwards-only scan skips the one message that has the answer.
  const own = readResultIn(finished);
  if (own) return { ...own, scores, body };

  // Split turn: "read my resume", then "now review it" as a second message.
  const end = messages.findIndex((m) => m.id === finished.id);
  const upto = end === -1 ? messages.length : end;

  for (let i = upto - 1; i >= 0; i--) {
    const message = messages[i];
    // Scores BEFORE the read check, not after: a prior review turn carries
    // both, and reacting to its read would let this follow-up overwrite the
    // review that message already saved.
    if (
      message.role === "assistant" &&
      parseResumeReview(assistantText(message)).scores
    ) {
      return null;
    }
    const read = readResultIn(message);
    if (read) return { ...read, scores, body };
  }
  return null;
}
