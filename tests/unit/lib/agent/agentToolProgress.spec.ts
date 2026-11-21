import { createUIMessageStream, readUIMessageStream, type UIMessageStreamWriter } from "ai";
import { resumeStepLabel, toolStepReporter } from "@/lib/agent/steps/progress";

describe("resumeStepLabel", () => {
  const resume = { title: "Senior FS" };

  it("names the resume and why it was picked", () => {
    expect(resumeStepLabel({ resume, source: "default" }, "linked to this job"))
      .toBe('Using resume "Senior FS" (default)');
    expect(resumeStepLabel({ resume, source: "page" }, "linked to this job"))
      .toBe('Using resume "Senior FS" (linked to this job)');
  });

  it("adds no note for a named or only resume", () => {
    expect(resumeStepLabel({ resume, source: "named" }, "x")).toBe('Using resume "Senior FS"');
    expect(resumeStepLabel({ resume, source: "only" }, "x")).toBe('Using resume "Senior FS"');
  });
});

describe("toolStepReporter", () => {
  it("carries a relabel on every later write", () => {
    const write = vi.fn();
    const report = toolStepReporter("review_resume", { write } as unknown as UIMessageStreamWriter, "call-1");

    report("resume");
    report("prepare", { resume: "Using resume \"A\"" });
    report("generate");

    expect(write.mock.calls.map(([part]) => part.data)).toEqual([
      { steps: ["resume"] },
      { steps: ["resume", "prepare"], labels: { resume: "Using resume \"A\"" } },
      { steps: ["resume", "prepare", "generate"], labels: { resume: "Using resume \"A\"" } },
    ]);
  });

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
