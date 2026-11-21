import { createUIMessageStream, readUIMessageStream, type UIMessageStreamWriter } from "ai";
import { toolStepReporter } from "@/lib/agent/steps/progress";

describe("toolStepReporter", () => {
  it("writes a persisted progress part keyed by the tool call", () => {
    const write = vi.fn();
    const report = toolStepReporter("review_resume", { write } as unknown as UIMessageStreamWriter, "call-1");

    report("resume");
    report("prepare");

    expect(write).toHaveBeenNthCalledWith(1, {
      type: "data-tool-progress",
      id: "call-1",
      data: { steps: ["resume"] },
    });
    expect(write).toHaveBeenNthCalledWith(2, {
      type: "data-tool-progress",
      id: "call-1",
      data: { steps: ["resume", "prepare"] },
    });
    for (const [part] of write.mock.calls) expect(part).not.toHaveProperty("transient");
  });

  it("keeps one part per tool call holding the steps reached", async () => {
    const stream = createUIMessageStream({
      execute: ({ writer }) => {
        writer.write({ type: "start" });
        const first = toolStepReporter("review_resume", writer, "call-1");
        const second = toolStepReporter("review_resume", writer, "call-2");
        first("resume");
        first("prepare");
        second("resume");
      },
    });

    let message;
    for await (const snapshot of readUIMessageStream({ stream })) message = snapshot;

    const parts = (message?.parts ?? []).filter((part) => part.type === "data-tool-progress") as {
      id: string;
      data: { steps: string[] };
    }[];
    expect(parts.map((part) => [part.id, part.data.steps])).toEqual([
      ["call-1", ["resume", "prepare"]],
      ["call-2", ["resume"]],
    ]);
  });
});
