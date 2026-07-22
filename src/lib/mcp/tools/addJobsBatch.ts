import { z } from "zod";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { handleAddJob } from "@/lib/mcp/tools/addJob";

// Sequential, not Promise.all: entity resolution is check-then-act, and
// SQLite serializes writes anyway — parallelism here only buys races.
export async function handleAddJobsBatch(
  input: { jobs: Array<z.infer<typeof McpAddJobSchema>> },
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const total = input.jobs.length;
  const lines: string[] = [];

  for (let i = 0; i < total; i++) {
    const item = input.jobs[i];
    const label = `[${i + 1}/${total}] ${item.company} — ${item.jobTitle}`;
    let text: string;
    try {
      const result = await handleAddJob(item, userId, tokenName);
      text = result.content[0].text;
    } catch (err: any) {
      text = `Error: ${err?.message ?? "Unknown error"}`;
    }
    lines.push(`${label}: ${text}`);

    if (text.startsWith("Rate limit exceeded")) {
      const remaining = total - (i + 1);
      if (remaining > 0) {
        lines.push(
          `Stopped after the rate limit — ${remaining} item(s) not attempted. ` +
            `Retry them once the window resets.`,
        );
      }
      break;
    }
  }

  return { content: [{ type: "text", text: lines.join("\n\n") }] };
}
