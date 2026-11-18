import { z } from "zod";
import { McpAddJobSchema, type McpToolResult } from "@/models/mcp.schema";
import { handleAddJob } from "@/lib/mcp/tools/addJob";

// Sequential, not Promise.all: entity resolution is check-then-act, so
// parallel calls naming the same new entity race to create it twice.
export async function handleAddJobsBatch(
  input: { jobs: Array<z.infer<typeof McpAddJobSchema>> },
  userId: string,
  tokenName: string,
): Promise<McpToolResult> {
  const total = input.jobs.length;
  const lines: string[] = [];
  const results: Array<Record<string, unknown>> = [];

  for (let i = 0; i < total; i++) {
    const item = input.jobs[i];
    const label = `[${i + 1}/${total}] ${item.company} — ${item.jobTitle}`;
    let text: string;
    let fields: Record<string, unknown> | undefined;
    try {
      const result = await handleAddJob(item, userId, tokenName);
      text = result.content[0].text;
      fields = result.structuredContent;
    } catch (err: any) {
      text = `Error: ${err?.message ?? "Unknown error"}`;
    }
    lines.push(`${label}: ${text}`);
    results.push({ index: i + 1, ...(fields ?? { error: text }) });

    if (text.startsWith("Rate limit exceeded")) {
      const remaining = total - (i + 1);
      for (let j = i + 2; j <= total; j++) results.push({ index: j, skipped: true });
      if (remaining > 0) {
        lines.push(
          `Stopped after the rate limit — ${remaining} item(s) not attempted. ` +
            `Retry them once the window resets.`,
        );
      }
      break;
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n\n") }],
    structuredContent: { results },
  };
}
