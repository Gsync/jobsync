import { z } from "zod";
import { McpAddJobSchema, type McpToolResult } from "@/models/mcp.schema";
import type { DuplicateJobRef } from "@/lib/jobs/jobDedupe";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { updateJobFromNames } from "@/lib/jobs/updateJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { buildMatchOffer, composeOfferMessage } from "@/lib/mcp/tools/matchDirective";

export async function handleAddJob(
  input: z.infer<typeof McpAddJobSchema>,
  userId: string,
  tokenName: string,
): Promise<McpToolResult> {
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
      const duplicate = result.duplicateOf;
      if (input.upsert && duplicate) {
        return upsertExisting(duplicate, input, userId);
      }
      // A web-app duplicate can't be updated, so the hint would contradict it
      const hint = duplicate && !duplicate.updatable
        ? ""
        : " No match offered for duplicates — pass upsert: true (or call update_job)" +
          " to enrich the existing record instead.";
      const text = result.message + hint;
      return {
        content: [{ type: "text", text }],
        ...(duplicate && { structuredContent: duplicateFields(duplicate) }),
      };
    }

    const offer = await buildMatchOffer(
      result.jobId,
      userId,
      result.descriptionCompleteness ?? "title-only",
      "add",
    );
    return {
      content: [{ type: "text", text: composeOfferMessage(result.message, offer) }],
      structuredContent: { duplicate: false, jobId: result.jobId },
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}

function duplicateFields(duplicate: DuplicateJobRef) {
  return {
    duplicate: true,
    existingJobId: duplicate.id,
    existingStatus: duplicate.status,
  };
}

// Routes a detected duplicate into the patch path. Add-only flags are
// dropped: upsert/allowDuplicate mean nothing to an update, and createdVia
// must not be rewritten to whichever token happened to re-submit the job.
// status is dropped too: a re-run search must never move an applied or
// withdrawn job back to "new".
async function upsertExisting(
  duplicate: DuplicateJobRef,
  input: z.infer<typeof McpAddJobSchema>,
  userId: string,
): Promise<McpToolResult> {
  const { upsert, allowDuplicate, status, ...fields } = input;
  const result = await updateJobFromNames({ jobId: duplicate.id, ...fields }, userId);
  const structuredContent = { ...duplicateFields(duplicate), updated: result.updated };
  const statusNote =
    status !== undefined && status !== duplicate.status
      ? ` Status kept as "${duplicate.status}" — call update_job to change it.`
      : "";
  const message = result.message + statusNote;

  if (!result.updated || !result.descriptionChanged) {
    return { content: [{ type: "text", text: message }], structuredContent };
  }

  const offer = await buildMatchOffer(
    result.jobId,
    userId,
    result.descriptionCompleteness ?? "title-only",
    "update",
  );
  return {
    content: [{ type: "text", text: composeOfferMessage(message, offer) }],
    structuredContent,
  };
}
