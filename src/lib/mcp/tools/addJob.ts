import { z } from "zod";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export const addJobToolDefinition = {
  name: "add_job",
  description:
    "Add a job application to JobSync. Resolves or creates company, job title, location, and source by name. Returns a transparency report of what was matched vs. created.",
  inputSchema: McpAddJobSchema,
} as const;

export async function handleAddJob(
  input: z.infer<typeof McpAddJobSchema>,
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
    const result = await createJobFromNames(
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
