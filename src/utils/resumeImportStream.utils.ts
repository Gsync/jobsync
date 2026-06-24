import type { DeepPartial } from "ai";
import {
  ResumeImportData,
  ResumeImportSchema,
} from "@/models/resumeImport.schema";
import { AiModel } from "@/models/ai.model";

type StreamResumeImportArgs = {
  resumeId: string;
  selectedModel: AiModel;
  // Called on each stream chunk with the partially-parsed object so the UI can
  // render cards as they arrive.
  onPartial?: (data: DeepPartial<ResumeImportData>) => void;
  signal?: AbortSignal;
};

// Consumes the NDJSON partial-object response from /api/ai/resume/import. Each
// line is a full snapshot of the parsed object so far; the latest complete line
// is the most up-to-date state. Reads the truncation flag from a header and
// returns the final validated object.
export async function streamResumeImport({
  resumeId,
  selectedModel,
  onPartial,
  signal,
}: StreamResumeImportArgs): Promise<{
  data: ResumeImportData;
  truncated: boolean;
}> {
  const res = await fetch("/api/ai/resume/import", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeId, selectedModel }),
    signal,
  });

  // Pre-generation failures (auth, rate limit, extraction) still return JSON.
  if (!res.ok || !res.body) {
    let message = "Failed to structure resume.";
    try {
      const err = await res.json();
      if (err?.error) message = err.error;
    } catch {
      // Non-JSON error body — keep the default message.
    }
    throw new Error(message);
  }

  const truncated =
    res.headers.get("x-resume-import-truncated") === "true";

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let latest: DeepPartial<ResumeImportData> | undefined;

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    try {
      const obj = JSON.parse(trimmed);
      if (obj && typeof obj === "object") {
        latest = obj as DeepPartial<ResumeImportData>;
        onPartial?.(latest);
      }
    } catch {
      // Incomplete/garbled line — keep the last good snapshot.
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? ""; // keep the incomplete trailing line
      for (const line of lines) handleLine(line);
    }
  } catch (err) {
    // The stream can end abnormally near completion (e.g. server-side abort or
    // ERR_INCOMPLETE_CHUNKED_ENCODING). Salvage the last snapshot; only surface
    // the error if nothing usable arrived.
    if (!latest) throw err;
  }
  handleLine(buffer); // flush a final newline-less line

  if (!latest || typeof latest !== "object") {
    throw new Error(
      "The AI service returned no data. Please ensure it is running and try again.",
    );
  }

  const validated = ResumeImportSchema.safeParse(latest);
  const data = validated.success
    ? validated.data
    : (latest as ResumeImportData);

  return { data, truncated };
}
