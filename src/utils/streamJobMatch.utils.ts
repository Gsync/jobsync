import { AiModel } from "@/models/ai.model";
import { JobMatchResult } from "@/models/ai.schemas";
import { parseJobMatch } from "@/lib/ai/jobMatch/parse";

export type { JobMatchResult };

type StreamJobMatchArgs = {
  resumeId: string;
  jobId: string;
  selectedModel: AiModel;
  // Called on each chunk with the parsed-so-far result for progressive render.
  onUpdate?: (result: JobMatchResult) => void;
  signal?: AbortSignal;
};

// Consumes the plain-text stream from /api/ai/resume/match and returns the
// parsed scores + markdown body. Salvages whatever arrived if the stream ends
// abnormally.
export async function streamJobMatch({
  resumeId,
  jobId,
  selectedModel,
  onUpdate,
  signal,
}: StreamJobMatchArgs): Promise<JobMatchResult> {
  const res = await fetch("/api/ai/resume/match", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, jobId, selectedModel }),
    signal,
  });

  // Pre-generation failures (auth, rate limit, preprocessing) still return JSON.
  if (!res.ok || !res.body) {
    let message = "Failed to get job match analysis.";
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
      onUpdate?.(parseJobMatch(raw));
    }
  } catch (err) {
    // Abnormal end (abort / incomplete chunked encoding): keep what we have.
    if (!raw) throw err;
  }

  const final = parseJobMatch(raw);
  if (!final.body && !final.scores) {
    throw new Error(
      "The AI service returned no data. Please ensure it is running and try again.",
    );
  }
  onUpdate?.(final);
  return final;
}
