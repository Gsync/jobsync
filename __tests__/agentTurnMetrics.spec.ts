import { tool, type ModelMessage, type ToolSet } from "ai";
import { z } from "zod";
import { measureTurnPrefix } from "@/lib/agent/turnMetrics";

const messages: ModelMessage[] = [{ role: "user", content: "add this job" }];

function toolsWith(description: string): ToolSet {
  return {
    add_job: tool({
      description,
      inputSchema: z.object({
        company: z.string().describe("Who is hiring."),
      }),
      execute: async () => ({ ok: true }),
    }),
  };
}

describe("measureTurnPrefix", () => {
  it("counts the JSON schema, not just the description", () => {
    const metrics = measureTurnPrefix({
      userId: "u1",
      system: "system prompt",
      tools: toolsWith("Add a job."),
      modelMessages: messages,
    });

    expect(metrics.systemChars).toBe("system prompt".length);
    expect(metrics.messageChars).toBe(JSON.stringify(messages).length);
    // Name plus description is 18 characters; the rest is the schema, which
    // is the half the review says grows fastest.
    expect(metrics.toolChars).toBeGreaterThan(100);
  });

  it("reports no change on the first turn and on an identical repeat", () => {
    const args = {
      userId: "u2",
      system: "system prompt",
      tools: toolsWith("Add a job."),
      modelMessages: messages,
    };

    expect(measureTurnPrefix(args).prefixChanged).toBe(false);
    expect(measureTurnPrefix(args).prefixChanged).toBe(false);
  });

  it("reports a change when the tool material differs", () => {
    measureTurnPrefix({
      userId: "u3",
      system: "system prompt",
      tools: toolsWith("Add a job."),
      modelMessages: messages,
    });

    const changed = measureTurnPrefix({
      userId: "u3",
      system: "system prompt",
      tools: toolsWith("Add a job application."),
      modelMessages: messages,
    });

    expect(changed.prefixChanged).toBe(true);
  });

  it("reports a change when the system prompt differs", () => {
    const tools = toolsWith("Add a job.");
    measureTurnPrefix({
      userId: "u4",
      system: "system prompt",
      tools,
      modelMessages: messages,
    });

    const changed = measureTurnPrefix({
      userId: "u4",
      system: "a different system prompt",
      tools,
      modelMessages: messages,
    });

    expect(changed.prefixChanged).toBe(true);
  });

  it("tracks each user's prefix separately", () => {
    measureTurnPrefix({
      userId: "u5",
      system: "system prompt",
      tools: toolsWith("Add a job."),
      modelMessages: messages,
    });

    // A different user's first turn has no previous prefix of its own, so it
    // must not read u5's.
    const other = measureTurnPrefix({
      userId: "u6",
      system: "a different system prompt",
      tools: toolsWith("Add a job application."),
      modelMessages: messages,
    });

    expect(other.prefixChanged).toBe(false);
  });
});
