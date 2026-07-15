import { AiModel } from "@/models/ai.model";
import {
  parseResumeReview,
  type ResumeReviewResult,
} from "@/lib/ai/resumeReview/parse";

export type { ResumeReviewResult } from "@/lib/ai/resumeReview/parse";

type StreamResumeReviewArgs = {
  resumeId: string;
  selectedModel: AiModel;
  // Called on each chunk with the parsed-so-far result for progressive render.
  onUpdate?: (result: ResumeReviewResult) => void;
  signal?: AbortSignal;
};

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
      onUpdate?.(parseResumeReview(raw));
    }
  } catch (err) {
    // Abnormal end (abort / incomplete chunked encoding): keep what we have.
    if (!raw) throw err;
  }

  const final = parseResumeReview(raw);
  if (!final.body && !final.scores) {
    throw new Error(
      "The AI service returned no data. Please ensure it is running and try again.",
    );
  }
  onUpdate?.(final);
  return final;
}
