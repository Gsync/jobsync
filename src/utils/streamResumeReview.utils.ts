import { ResumeScores } from "@/models/ai.schemas";
import { AiModel } from "@/models/ai.model";

export type ResumeReviewResult = {
  scores?: ResumeScores;
  // Markdown review body (scores line and any <think> blocks stripped out).
  body: string;
};

type StreamResumeReviewArgs = {
  resumeId: string;
  selectedModel: AiModel;
  // Called on each chunk with the parsed-so-far result for progressive render.
  onUpdate?: (result: ResumeReviewResult) => void;
  signal?: AbortSignal;
};

// Match greedily on digits (not {1,3}) so an out-of-range value like 1000
// still parses — clamp() below brings it back into 0-100 rather than failing
// the whole line and dropping every score.
const SCORES_RE =
  /SCORES:\s*overall=(\d+)\s+impact=(\d+)\s+clarity=(\d+)\s+ats=(\d+)/i;

// Reasoning models (e.g. qwen3 family) emit <think>...</think> in the text
// stream. Drop complete blocks, and drop an unterminated trailing block so a
// half-finished thought never flashes into the rendered review.
function stripThinking(text: string): string {
  let out = text.replace(/<think>[\s\S]*?<\/think>/gi, "");
  const openIdx = out.search(/<think>/i);
  if (openIdx !== -1) out = out.slice(0, openIdx);
  return out;
}

function parse(raw: string): ResumeReviewResult {
  const text = stripThinking(raw);
  const match = text.match(SCORES_RE);

  let scores: ResumeScores | undefined;
  if (match) {
    const clamp = (n: number) => Math.max(0, Math.min(100, n));
    scores = {
      overall: clamp(Number(match[1])),
      impact: clamp(Number(match[2])),
      clarity: clamp(Number(match[3])),
      atsCompatibility: clamp(Number(match[4])),
    };
  }

  // Remove the scores line from the body. Before it has fully streamed, also
  // hide a leading partial "SCORES:" line so it doesn't flash in the markdown.
  let body = match
    ? text.replace(match[0], "")
    : text.replace(/^\s*SCORES:[^\n]*(\n|$)/i, "");
  body = body.replace(/^\s+/, "");

  return { scores, body };
}

// Consumes the plain-text stream from /api/ai/resume/review and returns the
// parsed scores + markdown body. Salvages whatever arrived if the stream ends
// abnormally.
export async function streamResumeReview({
  resumeId,
  selectedModel,
  onUpdate,
  signal,
}: StreamResumeReviewArgs): Promise<ResumeReviewResult> {
  const res = await fetch("/api/ai/resume/review", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ selectedModel, resumeId }),
    signal,
  });

  // Pre-generation failures (auth, rate limit, preprocessing) still return JSON.
  if (!res.ok || !res.body) {
    let message = "Failed to get AI review.";
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new Error(message);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let raw = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      raw += decoder.decode(value, { stream: true });
      onUpdate?.(parse(raw));
    }
  } catch (err) {
    // Abnormal end (abort / incomplete chunked encoding): keep what we have.
    if (!raw) throw err;
  }

  const final = parse(raw);
  if (!final.body && !final.scores) {
    throw new Error(
      "The AI service returned no data. Please ensure it is running and try again.",
    );
  }
  onUpdate?.(final);
  return final;
}
