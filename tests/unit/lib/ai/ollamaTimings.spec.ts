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
  it("converts final chunk durations to milliseconds", () => {
    expect(readOllamaTimings(done)).toEqual(timings);
  });

  it.each([undefined, "invalid", { ...done, done: false }, { done: true }, { choices: [] }])(
    "ignores non-final and unrelated raw values (%j)", (value) => {
      expect(readOllamaTimings(value)).toBeUndefined();
    },
  );
});

describe("addOllamaTimings", () => {
  it("sums timings across steps", () => {
    expect(addOllamaTimings(undefined, timings)).toEqual(timings);
    expect(addOllamaTimings(timings, timings)).toEqual({
      loadMs: 4000, promptEvalMs: 3000, promptEvalTokens: 6000, evalMs: 8000,
    });
  });
});
