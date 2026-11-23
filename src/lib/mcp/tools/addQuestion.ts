import type { McpAddQuestionInput, McpToolResult } from "@/models/mcp.schema";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { describeQuestionResult } from "@/lib/mcp/tools/questionProse";

export function rateLimitText(resetIn: number): string {
  return `Rate limit exceeded. Try again in ${Math.ceil(resetIn / 1000)}s.`;
}

export async function handleAddQuestion(
  input: McpAddQuestionInput,
  userId: string,
  tokenName: string,
): Promise<McpToolResult> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    return { content: [{ type: "text", text: rateLimitText(rateCheck.resetIn) }] };
  }

  try {
    const [result] = await saveQuestions([input], userId, {
      createdVia: tokenName,
      replaceAgentCreatedOnly: true,
    });
    return {
      content: [{ type: "text", text: describeQuestionResult(result) }],
      structuredContent: result,
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}
