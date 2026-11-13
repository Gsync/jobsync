import { startAiCall, statusOf, usageOfSteps } from "@/lib/aiUsage/tracker";
import prisma from "@/lib/db";

vi.mock("@/lib/db", () => ({ default: { aiCall: { create: vi.fn() } } }));
vi.mock("@/lib/telemetry", () => ({ log: { warn: vi.fn() } }));

const db = prisma as any;

const timedOut = () => {
  const c = new AbortController();
  c.abort(new DOMException("deadline", "TimeoutError"));
  return c.signal;
};
const stoppedByUser = () => {
  const c = new AbortController();
  c.abort();
  return c.signal;
};

describe("statusOf", () => {
  it.each([
    ["stop", "ok"],
    ["tool-calls", "ok"],
    ["length", "truncated"],
    ["error", "error"],
    ["content-filter", "error"],
    ["other", "interrupted"],
    [undefined, "interrupted"],
  ])("maps finishReason %s to %s", (finishReason, expected) => {
    expect(statusOf({ finishReason })).toBe(expected);
  });

  it("treats a thrown error as error", () => {
    expect(statusOf({ error: new Error("ECONNREFUSED") })).toBe("error");
  });

  it("tells a timeout from a user stop by the abort reason", () => {
    expect(statusOf({ abortedBy: timedOut() })).toBe("timed_out");
    expect(statusOf({ abortedBy: stoppedByUser() })).toBe("stopped");
  });

  it("reads a timeout through AbortSignal.any", () => {
    const combined = AbortSignal.any([new AbortController().signal, timedOut()]);
    expect(statusOf({ error: new Error("aborted"), abortedBy: combined })).toBe("timed_out");
  });

  it("ignores a signal that never fired", () => {
    const idle = new AbortController().signal;
    expect(statusOf({ error: new Error("boom"), abortedBy: idle })).toBe("error");
  });
});

describe("usageOfSteps", () => {
  it("sums finished steps", () => {
    expect(
      usageOfSteps([
        { usage: { inputTokens: 100, outputTokens: 10 } },
        { usage: { inputTokens: 50, outputTokens: undefined } },
      ]),
    ).toEqual({ inputTokens: 150, outputTokens: 10 });
  });

  it("is undefined when no step finished", () => {
    expect(usageOfSteps([])).toBeUndefined();
  });
});

describe("startAiCall", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-28T10:00:00Z"));
    db.aiCall.create.mockResolvedValue({});
  });
  afterEach(() => vi.useRealTimers());

  const start = (provider = "ollama") =>
    startAiCall({ userId: "u1", feature: "agent_chat", provider, model: "qwen3.5:9b", numCtx: 16384 });

  it("writes one row with duration, first token and usage", async () => {
    const t = start();
    vi.advanceTimersByTime(1500);
    t.markFirstToken();
    vi.advanceTimersByTime(1500);
    t.markFirstToken(); // only the first one counts
    vi.advanceTimersByTime(2000);
    await t.finish({ usage: { inputTokens: 900, outputTokens: 80 }, finishReason: "stop" });

    expect(db.aiCall.create).toHaveBeenCalledWith({
      data: {
        userId: "u1",
        feature: "agent_chat",
        provider: "ollama",
        model: "qwen3.5:9b",
        status: "ok",
        inputTokens: 900,
        outputTokens: 80,
        durationMs: 5000,
        firstTokenMs: 1500,
        numCtx: 16384,
        startedAt: new Date("2026-09-28T10:00:00Z"),
      },
    });
  });

  it("subtracts excluded time and never goes negative", async () => {
    const t = start();
    vi.advanceTimersByTime(3000);
    await t.finish({ finishReason: "stop", excludeMs: 5000 });
    expect(db.aiCall.create.mock.calls[0][0].data.durationMs).toBe(0);
  });

  it("stores numCtx for Ollama only", async () => {
    await start("deepseek").finish({ finishReason: "stop" });
    expect(db.aiCall.create.mock.calls[0][0].data.numCtx).toBeNull();
  });

  it("records nulls when the provider reported no usage", async () => {
    await start().finish({ error: new Error("fetch failed") });
    const { data } = db.aiCall.create.mock.calls[0][0];
    expect(data).toMatchObject({ status: "error", inputTokens: null, outputTokens: null, firstTokenMs: null });
  });

  it("writes only once when finish is called twice", async () => {
    const t = start();
    await t.finish({ finishReason: "stop" });
    await t.finish({ error: new Error("late") });
    expect(db.aiCall.create).toHaveBeenCalledTimes(1);
  });

  it("never throws when the insert fails", async () => {
    db.aiCall.create.mockRejectedValue(new Error("database is locked"));
    await expect(start().finish({ finishReason: "stop" })).resolves.toBeUndefined();
  });
});
