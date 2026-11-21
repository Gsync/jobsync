vi.mock("@/auth", () => ({ auth: vi.fn(async () => ({ user: { id: "user-1" } })) }));
vi.mock("next/server", () => ({
  NextResponse: { json: (data: unknown, init?: { status?: number }) => ({ status: init?.status ?? 200, json: async () => data }) },
}));
vi.mock("@/lib/ai/rate-limiter", () => ({ checkRateLimit: () => ({ allowed: true }) }));
vi.mock("@/lib/ai/providers", () => ({ getModel: vi.fn(async () => ({ id: "m" })) }));
vi.mock("@/lib/ai", () => ({ preprocessText: async (t: string) => ({ success: true, data: { normalizedText: t } }) }));
vi.mock("@/lib/ai/import/extract-text", () => ({
  extractText: async () => ({ success: true, data: { text: "resume text", truncated: false } }),
}));
vi.mock("@/lib/resumeFiles", () => ({ isResumeFilePath: () => true }));
vi.mock("@/lib/db", () => ({
  default: { resume: { findUnique: async () => ({ File: { filePath: "/uploads/files/resumes/a.pdf" } }) } },
}));
vi.mock("fs", () => ({ default: { existsSync: () => true, readFileSync: () => Buffer.from("x") } }));

const markFirstToken = vi.fn();
const finish = vi.fn();
const startAiCall = vi.fn((..._a: unknown[]) => ({ markFirstToken, finish }));
vi.mock("@/lib/aiUsage/tracker", () => ({ startAiCall: (...a: unknown[]) => startAiCall(...a) }));

const span = { traceId: "", spanId: "", setAttrs: vi.fn(), setError: vi.fn(), end: vi.fn() };
vi.mock("@/lib/telemetry", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/telemetry")>()),
  startSpan: () => span,
}));

let options: any;
const defaultPartials = async function* (): AsyncGenerator<unknown> {
  yield { summary: "a" };
  yield { summary: "ab" };
};
let partials = defaultPartials;
vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    streamText: (o: any) => {
      options = o;
      return { partialOutputStream: partials() };
    },
  };
});

import { POST } from "@/app/api/ai/resume/import/route";

const req = () =>
  ({
    json: async () => ({ resumeId: "r1", selectedModel: { provider: "ollama", model: "qwen3.5:9b" } }),
    signal: new AbortController().signal,
  }) as any;

async function drain(res: Response) {
  const reader = res.body!.getReader();
  while (!(await reader.read()).done);
}

async function lastLine(res: Response): Promise<unknown> {
  const lines = (await res.text()).trim().split("\n");
  return JSON.parse(lines.at(-1)!);
}

// The stream stays open until the test aborts it, as streamText's does.
function openUntilAborted() {
  let close!: () => void;
  const closed = new Promise<void>((resolve) => (close = resolve));
  partials = async function* () {
    await closed;
  };
  return () => {
    options.onAbort({ steps: [] });
    close();
  };
}

describe("resume import usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    partials = defaultPartials;
  });

  it("records one resume_import call and marks the first snapshot", async () => {
    const res = await POST(req());
    await drain(res as Response);
    expect(startAiCall).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", feature: "resume_import", provider: "ollama", model: "qwen3.5:9b" }),
    );
    expect(markFirstToken).toHaveBeenCalled();
  });

  it("finishes with usage on completion, and error on a stream error", async () => {
    await POST(req());
    options.onEnd({ usage: { inputTokens: 3000, outputTokens: 900 }, finishReason: "stop" });
    expect(finish).toHaveBeenCalledWith({ usage: { inputTokens: 3000, outputTokens: 900 }, finishReason: "stop" });
    const err = new Error("boom");
    options.onError({ error: err });
    expect(finish).toHaveBeenLastCalledWith({ error: err, abortedBy: expect.any(AbortSignal) });
  });

  it("aborts with a TimeoutError reason when the deadline fires", async () => {
    vi.useFakeTimers();
    await POST(req());
    vi.advanceTimersByTime(240_000);
    options.onAbort({ steps: [] });
    const { abortedBy } = finish.mock.calls[0][0];
    expect(abortedBy.reason.name).toBe("TimeoutError");
    expect(span.setError).toHaveBeenCalledWith(abortedBy.reason);
    expect(span.end).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });

  it("ends the span without an error when the client disconnects", async () => {
    await POST(req());
    options.onAbort({ steps: [] });
    expect(span.setError).not.toHaveBeenCalled();
    expect(span.end).toHaveBeenCalledTimes(1);
  });

  it("tells the client the request timed out when the deadline aborts it", async () => {
    vi.useFakeTimers();
    const abort = openUntilAborted();
    const res = (await POST(req())) as Response;
    vi.advanceTimersByTime(240_000);
    vi.useRealTimers();
    abort();
    expect(await lastLine(res)).toEqual({ __error: expect.stringMatching(/timed out after \d+ seconds/) });
  });

  it("sends no error line when the client disconnects", async () => {
    const client = new AbortController();
    const abort = openUntilAborted();
    const res = (await POST({ ...req(), signal: client.signal })) as Response;
    client.abort();
    abort();
    expect((await res.text()).trim()).toBe("");
  });
});
