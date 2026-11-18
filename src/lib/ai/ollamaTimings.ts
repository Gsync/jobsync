export type OllamaTimings = {
  loadMs: number;
  promptEvalMs: number;
  promptEvalTokens: number;
  promptCachedTokens?: number;
  evalMs: number;
};

function milliseconds(ns: unknown): number {
  return typeof ns === "number" ? Math.round(ns / 1e6) : 0;
}

export function readOllamaTimings(rawValue: unknown): OllamaTimings | undefined {
  if (!rawValue || typeof rawValue !== "object") return;
  const raw = rawValue as Record<string, unknown>;
  if (raw.done !== true || typeof raw.prompt_eval_count !== "number") return;

  return {
    loadMs: milliseconds(raw.load_duration),
    promptEvalMs: milliseconds(raw.prompt_eval_duration),
    promptEvalTokens: raw.prompt_eval_count,
    ...(typeof raw.prompt_eval_cached_count === "number" && {
      promptCachedTokens: raw.prompt_eval_cached_count,
    }),
    evalMs: milliseconds(raw.eval_duration),
  };
}

export function addOllamaTimings(total: OllamaTimings | undefined, step: OllamaTimings): OllamaTimings {
  if (!total) return step;
  return {
    loadMs: total.loadMs + step.loadMs,
    promptEvalMs: total.promptEvalMs + step.promptEvalMs,
    promptEvalTokens: total.promptEvalTokens + step.promptEvalTokens,
    ...(total.promptCachedTokens !== undefined && step.promptCachedTokens !== undefined && {
      promptCachedTokens: total.promptCachedTokens + step.promptCachedTokens,
    }),
    evalMs: total.evalMs + step.evalMs,
  };
}

export function ollamaTimingAttrs(timings: Partial<OllamaTimings> | undefined) {
  if (timings?.loadMs === undefined) return {};
  return {
    "jobsync.ollama.load_ms": timings.loadMs,
    "jobsync.ollama.prompt_eval_ms": timings.promptEvalMs,
    "jobsync.ollama.prompt_eval_tokens": timings.promptEvalTokens,
    ...(timings.promptCachedTokens !== undefined && {
      "jobsync.ollama.prompt_cached_tokens": timings.promptCachedTokens,
    }),
    "jobsync.ollama.eval_ms": timings.evalMs,
  };
}
