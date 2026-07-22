import { z } from "zod";
import { McpUpdateJobSchema } from "@/models/mcp.schema";
import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { buildMatchOffer, composeOfferMessage } from "@/lib/mcp/tools/matchDirective";

export async function handleUpdateJob(
  input: z.infer<typeof McpUpdateJobSchema>,
  userId: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const result = await updateJobFromNames(input, userId);

    // A fresh match is only worth requesting when the text it would be
    // scored against actually changed — a status or salary edit doesn't
    // invalidate an existing score.
    if (!result.updated || !result.descriptionChanged) {
      return { content: [{ type: "text", text: result.message }] };
    }

    const offer = await buildMatchOffer(
      result.jobId,
      userId,
      result.descriptionCompleteness ?? "title-only",
      "update",
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
