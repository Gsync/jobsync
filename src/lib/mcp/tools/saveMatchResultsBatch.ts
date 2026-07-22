import { z } from "zod";
import { McpSaveMatchResultSchema } from "@/models/mcp.schema";
import { handleSaveMatchResult } from "@/lib/mcp/tools/saveMatchResult";

export async function handleSaveMatchResultsBatch(
  input: { results: Array<z.infer<typeof McpSaveMatchResultSchema>> },
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const total = input.results.length;
  const lines: string[] = [];

  for (let i = 0; i < total; i++) {
    const item = input.results[i];
    const label = `[${i + 1}/${total}] ${item.jobId}`;
    let text: string;
    try {
      const result = await handleSaveMatchResult(item, userId, tokenName);
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
