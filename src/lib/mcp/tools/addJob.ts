import { z } from "zod";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
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
      if (input.upsert && result.duplicateOf) {
        return upsertExisting(result.duplicateOf.id, input, userId);
      }
      const text =
        result.message +
        " No match offered for duplicates — pass upsert: true (or call update_job)" +
        " to enrich the existing record instead.";
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

// Routes a detected duplicate into the patch path. Add-only flags are
// dropped: upsert/allowDuplicate mean nothing to an update, and createdVia
// must not be rewritten to whichever token happened to re-submit the job.
async function upsertExisting(
  jobId: string,
  input: z.infer<typeof McpAddJobSchema>,
  userId: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const { upsert, allowDuplicate, ...fields } = input;
  const result = await updateJobFromNames({ jobId, ...fields }, userId);

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
}
