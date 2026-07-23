import { streamCoverLetter } from "@/utils/streamCoverLetter.utils";
import { defaultModel } from "@/models/ai.model";

const encoder = new TextEncoder();

const streamOf = (chunks: string[]) => ({
  getReader: () => {
    let i = 0;
    return {
      read: async () =>
        i < chunks.length
          ? { done: false, value: encoder.encode(chunks[i++]) }
          : { done: true, value: undefined },
    };
  },
});

describe("streamCoverLetter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("accumulates chunks and returns the full letter", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamOf(["Dear Hiring ", "Manager,\n\nI build."]),
    }) as any;

    const updates: string[] = [];
    const result = await streamCoverLetter({
      jobId: "job-1",
      selectedModel: defaultModel,
      onUpdate: (text) => updates.push(text),
    });

    expect(result).toBe("Dear Hiring Manager,\n\nI build.");
    expect(updates.length).toBeGreaterThan(1);
  });

  it("strips <think> blocks", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: streamOf(["<think>plan</think>Dear Hiring Manager,"]),
    }) as any;

    const result = await streamCoverLetter({
      jobId: "job-1",
      selectedModel: defaultModel,
    });

    expect(result).not.toContain("plan");
    expect(result).toContain("Dear Hiring Manager,");
  });

  it("throws the server error message on a non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      body: null,
      json: async () => ({ error: "Rate limit exceeded." }),
    }) as any;

    await expect(
      streamCoverLetter({ jobId: "job-1", selectedModel: defaultModel }),
    ).rejects.toThrow("Rate limit exceeded.");
  });

  it("throws when the stream produces nothing", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: true, body: streamOf([]) }) as any;

    await expect(
      streamCoverLetter({ jobId: "job-1", selectedModel: defaultModel }),
    ).rejects.toThrow();
  });

  it("posts only ids, never content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: streamOf(["Dear Hiring Manager,"]) });
    global.fetch = fetchMock as any;

    await streamCoverLetter({ jobId: "job-1", selectedModel: defaultModel });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(Object.keys(body).sort()).toEqual(["jobId", "selectedModel"]);
  });

  it("forwards an explicit resumeId", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: true, body: streamOf(["Dear Hiring Manager,"]) });
    global.fetch = fetchMock as any;

    await streamCoverLetter({
      jobId: "job-1",
      resumeId: "resume-9",
      selectedModel: defaultModel,
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.resumeId).toBe("resume-9");
  });
});
