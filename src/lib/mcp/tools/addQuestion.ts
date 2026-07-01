import { z } from "zod";
import { McpAddQuestionSchema } from "@/models/mcp.schema";
import { createQuestionFromNames } from "@/lib/questions/createQuestionFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export const addQuestionToolDefinition = {
  name: "add_question",
  description:
    "Add an entry to the Question Bank. Resolves or creates tags by name. Returns a transparency report of what was matched vs. created.",
  inputSchema: McpAddQuestionSchema,
} as const;

export async function handleAddQuestion(
  input: z.infer<typeof McpAddQuestionSchema>,
  userId: string,
  tokenName: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const result = await createQuestionFromNames(
      { ...input, createdVia: tokenName },
      userId,
    );
    return { content: [{ type: "text", text: result.message }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}
