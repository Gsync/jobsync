import type { McpAddQuestionsBatchInput, McpToolResult } from "@/models/mcp.schema";
import { saveQuestions } from "@/lib/questions/saveQuestions";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { rateLimitText } from "@/lib/mcp/tools/addQuestion";
import { describeQuestionResult } from "@/lib/mcp/tools/questionProse";
import type { SaveQuestionResult } from "@/models/question.model";

// One rate-limit unit per question, in order, up to the first denial
function allowedCount(userId: string, total: number): { allowed: number; resetIn: number } {
  for (let i = 0; i < total; i++) {
    const check = checkMcpRateLimit(userId);
    if (!check.allowed) return { allowed: i, resetIn: check.resetIn };
  }
  return { allowed: total, resetIn: 0 };
}

// One saveQuestions call: repeat folding and duplicates span the batch
export async function handleAddQuestionsBatch(
  input: McpAddQuestionsBatchInput,
  userId: string,
  tokenName: string,
): Promise<McpToolResult> {
  const total = input.questions.length;
  const { allowed, resetIn } = allowedCount(userId, total);
  if (allowed === 0) {
    return { content: [{ type: "text", text: rateLimitText(resetIn) }] };
  }

  let saved: SaveQuestionResult[];
  try {
    saved = await saveQuestions(input.questions.slice(0, allowed), userId, {
      createdVia: tokenName,
      replaceAgentCreatedOnly: true,
    });
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }

  const lines = saved.map(
    (result) => `[${result.index}/${total}] ${input.questions[result.index - 1].question}: ${describeQuestionResult(result)}`,
  );
  const results: Array<Record<string, unknown>> = saved.map((result) => ({ ...result }));
  const remaining = total - allowed;
  for (let index = allowed + 1; index <= total; index++) results.push({ index, skipped: true });
  if (remaining > 0) {
    lines.push(`Stopped after the rate limit — ${remaining} item(s) not attempted. Retry them once the window resets.`);
  }

  return {
    content: [{ type: "text", text: lines.join("\n\n") }],
    structuredContent: { results },
  };
}
