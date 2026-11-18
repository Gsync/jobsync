import { addOllamaTimings, readOllamaTimings } from "@/lib/ai/ollamaTimings";

const done = {
  done: true,
  load_duration: 2_000_000_000,
  prompt_eval_count: 3000,
  prompt_eval_duration: 1_500_000_000,
  eval_count: 120,
  eval_duration: 4_000_000_000,
};
const timings = { loadMs: 2000, promptEvalMs: 1500, promptEvalTokens: 3000, evalMs: 4000 };

describe("readOllamaTimings", () => {
  it("converts final chunk durations to milliseconds and preserves the cache count", () => {
    expect(readOllamaTimings({ ...done, prompt_eval_cached_count: 2900 }))
      .toEqual({ ...timings, promptCachedTokens: 2900 });
    expect(readOllamaTimings(done)).toEqual(timings);
    expect(readOllamaTimings(done)).not.toHaveProperty("promptCachedTokens");
  });

  it.each([undefined, "invalid", { ...done, done: false }, { done: true }, { choices: [] }])(
    "ignores non-final and unrelated raw values (%j)", (value) => {
      expect(readOllamaTimings(value)).toBeUndefined();
    },
  );
});

describe("addOllamaTimings", () => {
  const step = { ...timings, promptCachedTokens: 2900 };

  it("sums timings across steps", () => {
    expect(addOllamaTimings(undefined, step)).toEqual(step);
    expect(addOllamaTimings(step, step)).toEqual({
      loadMs: 4000, promptEvalMs: 3000, promptEvalTokens: 6000,
      promptCachedTokens: 5800, evalMs: 8000,
    });
  });

  it("omits cache totals when either step lacks a count", () => {
    expect(addOllamaTimings(step, timings)).not.toHaveProperty("promptCachedTokens");
    expect(addOllamaTimings(timings, step)).not.toHaveProperty("promptCachedTokens");
  });
});
