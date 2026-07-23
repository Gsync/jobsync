import { AiModel } from "@/models/ai.model";
import { stripThinking } from "@/lib/ai/stripThinking";

type StreamCoverLetterArgs = {
  jobId: string;
  // Omitted when the caller wants the server-side resolution chain.
  resumeId?: string;
  selectedModel: AiModel;
  // Called on each chunk with the cleaned text so far, for progressive render.
  onUpdate?: (markdown: string) => void;
  signal?: AbortSignal;
};

// Consumes the plain-text stream from /api/ai/cover-letter. Unlike job match
// there is nothing to parse — the whole response is the letter.
export async function streamCoverLetter({
  jobId,
  resumeId,
  selectedModel,
  onUpdate,
  signal,
}: StreamCoverLetterArgs): Promise<string> {
  const res = await fetch("/api/ai/cover-letter", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jobId,
      selectedModel,
      ...(resumeId && { resumeId }),
    }),
    signal,
  });

  // Pre-generation failures (auth, rate limit, preprocessing) return JSON.
  if (!res.ok || !res.body) {
    let message = "Failed to generate cover letter.";
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
      onUpdate?.(stripThinking(raw).trim());
    }
  } catch (err) {
    // Abnormal end (abort / incomplete chunked encoding): keep what we have.
    if (!raw) throw err;
  }

  const final = stripThinking(raw).trim();
  if (!final) {
    throw new Error(
      "The AI service returned no data. Please ensure it is running and try again.",
    );
  }
  onUpdate?.(final);
  return final;
}
