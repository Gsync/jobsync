import {
  dayKey,
  percentile,
  rangeDayKeys,
  summarizeAiUsage,
  type AiCallRecord,
} from "@/lib/aiUsage/summarize";

const row = (over: Partial<AiCallRecord> = {}): AiCallRecord => ({
  startedAt: new Date("2026-09-27T15:00:00Z"),
  feature: "agent_chat",
  provider: "ollama",
  model: "qwen3.5:9b",
  status: "ok",
  inputTokens: 1000,
  outputTokens: 100,
  durationMs: 5000,
  firstTokenMs: 1000,
  numCtx: 16384,
  ...over,
});

const opts = {
  rangeDays: 7 as const,
  since: new Date("2026-09-22T04:00:00Z"), // Sep 22 00:00 in Toronto
  timeZone: "America/Toronto",
  previousCalls: 0,
};

describe("percentile", () => {
  it("uses nearest rank", () => {
    expect(percentile([5, 1, 3, 2, 4], 50)).toBe(3);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20], 95)).toBe(19);
  });
  it("is null for no values", () => {
    expect(percentile([], 50)).toBeNull();
  });
});

describe("days", () => {
  it("buckets by the viewer's calendar day", () => {
    expect(dayKey(new Date("2026-09-28T03:30:00Z"), "America/Toronto")).toBe("2026-09-27");
  });

  it("lists one key per day, oldest first, across a DST change", () => {
    const keys = rangeDayKeys(new Date("2026-10-29T04:00:00Z"), 7, "America/Toronto");
    expect(keys).toEqual(["2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"]);
  });
});

describe("summarizeAiUsage", () => {
  it("totals tokens, calls, failures and stopped", () => {
    const s = summarizeAiUsage(
      [
        row(),
        row({ status: "error", inputTokens: null, outputTokens: null, durationMs: 400, firstTokenMs: null }),
        row({ status: "timed_out" }),
        row({ status: "stopped" }),
      ],
      opts,
    );
    expect(s.totals).toMatchObject({ inputTokens: 3000, outputTokens: 300, calls: 4, failures: 2, stopped: 1 });
    expect(s.failuresByStatus).toEqual({ error: 1, truncated: 0, interrupted: 0, timed_out: 1 });
  });

  it("computes response times over completed calls only", () => {
    const s = summarizeAiUsage(
      [row({ durationMs: 8000 }), row({ status: "truncated", durationMs: 60000 }), row({ status: "error", durationMs: 100 })],
      opts,
    );
    expect(s.totals.medianMs).toBe(8000);
    expect(s.totals.p95Ms).toBe(60000);
  });

  it("buckets daily tokens by provider in the viewer's timezone", () => {
    const s = summarizeAiUsage(
      [row({ startedAt: new Date("2026-09-28T03:30:00Z") }), row({ provider: "deepseek", numCtx: null })],
      opts,
    );
    const sep27 = s.days.find((d) => d.date === "2026-09-27")!;
    expect(sep27.tokensByProvider).toEqual({ ollama: 1100, deepseek: 1100 });
    expect(s.days).toHaveLength(7);
  });

  it("groups providers and models, largest first, and flags near-limit Ollama calls", () => {
    const s = summarizeAiUsage(
      [
        row({ inputTokens: 15000 }), // 15000 >= 0.9 * 16384
        row(),
        row({ provider: "deepseek", model: "deepseek-chat", numCtx: null, inputTokens: 50 }),
      ],
      opts,
    );
    expect(s.providers.map((p) => p.provider)).toEqual(["ollama", "deepseek"]);
    expect(s.providers[0].models[0]).toMatchObject({ model: "qwen3.5:9b", calls: 2, nearContextLimit: 1 });
  });

  it("orders features by tokens and omits unused ones", () => {
    const s = summarizeAiUsage([row({ feature: "automations", inputTokens: 5000 }), row()], opts);
    expect(s.features.map((f) => f.feature)).toEqual(["automations", "agent_chat"]);
  });

  it("passes the previous period's count through", () => {
    expect(summarizeAiUsage([], { ...opts, previousCalls: 12 }).totals.previousCalls).toBe(12);
  });
});
