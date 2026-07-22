import { z } from "zod";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { buildMatchOffer, composeOfferMessage } from "@/lib/mcp/tools/matchDirective";

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

    if (!result.created || !result.jobId) {
      const text =
        result.message +
        " No match offered for duplicates — call update_job to enrich the existing record, then it will be offered.";
      return { content: [{ type: "text", text }] };
    }

    const offer = await buildMatchOffer(
      result.jobId,
      userId,
      result.descriptionCompleteness ?? "title-only",
      "add",
    );
    return {
      content: [{ type: "text", text: composeOfferMessage(result.message, offer) }],
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}
