import { describe, it, expect, vi, afterEach } from "vitest";
import { streamResumeImport } from "@/utils/resumeImportStream.utils";
import { AiProvider } from "@/models/ai.model";

function streamingResponse(
  chunks: string[],
  headers: Record<string, string> = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enc = new TextEncoder();
      for (const c of chunks) controller.enqueue(enc.encode(c));
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers });
}

const selectedModel = { provider: AiProvider.OLLAMA, model: "llama3.1" };

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("streamResumeImport", () => {
  it("parses progressively and returns the validated final object", async () => {
    // NDJSON snapshots split across chunks, mid-line boundaries included.
    const chunks = [
      '{"summary":"Senior engineer."}\n{"summary":"Senior engineer.","exp',
      'erience":[{"company":"Acme","jobTitle":"Eng',
      'ineer","description":"• Built things"}]}\n',
    ];
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamingResponse(chunks, { "x-resume-import-truncated": "true" }),
      ),
    );

    const partials: number[] = [];
    const { data, truncated } = await streamResumeImport({
      resumeId: "r1",
      selectedModel,
      onPartial: (p) => partials.push((p.experience ?? []).length),
    });

    expect(truncated).toBe(true);
    expect(data.summary).toBe("Senior engineer.");
    expect(data.experience).toHaveLength(1);
    expect(data.experience[0].company).toBe("Acme");
    // Zod defaults applied to omitted arrays.
    expect(data.education).toEqual([]);
    expect(data.certifications).toEqual([]);
    // onPartial fired across multiple chunks.
    expect(partials.length).toBeGreaterThan(1);
  });

  it("defaults truncated to false when header is absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamingResponse(['{"summary":"hi"}'])),
    );

    const { truncated } = await streamResumeImport({
      resumeId: "r1",
      selectedModel,
    });

    expect(truncated).toBe(false);
  });

  it("salvages accumulated data when the stream errors near the end", async () => {
    const enc = new TextEncoder();
    const parts = [
      // A complete snapshot line, then an incomplete line, then the drop.
      '{"summary":"Done.","experience":[{"company":"Acme","jobTitle":"Engineer"}]}\n',
      '{"summary":"Done.","experience":[{"company":"Acme"',
    ];
    let step = 0;
    // pull-based so each chunk is read before the connection drops.
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (step < parts.length) {
          controller.enqueue(enc.encode(parts[step++]));
        } else {
          controller.error(new Error("ERR_INCOMPLETE_CHUNKED_ENCODING"));
        }
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(stream, { status: 200 })),
    );

    const { data } = await streamResumeImport({ resumeId: "r1", selectedModel });

    expect(data.summary).toBe("Done.");
    expect(data.experience[0].company).toBe("Acme");
  });

  it("throws the server error message on a non-ok response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Rate limit exceeded." }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      streamResumeImport({ resumeId: "r1", selectedModel }),
    ).rejects.toThrow("Rate limit exceeded.");
  });
});
