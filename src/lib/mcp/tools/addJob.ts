import { z } from "zod";
import { McpAddJobSchema } from "@/models/mcp.schema";
import { createJobFromNames } from "@/lib/jobs/createJobFromNames";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

type AddJobResponse = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent: {
    created: boolean;
    jobId: string | null;
    duplicateJobId: string | null;
    autoMatchPerformed: false;
  };
};

export async function handleAddJob(
  input: z.infer<typeof McpAddJobSchema>,
  userId: string,
  tokenName: string,
): Promise<AddJobResponse> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
      structuredContent: {
        created: false,
        jobId: null,
        duplicateJobId: null,
        autoMatchPerformed: false,
      },
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
        " No match offered for duplicates — you can match it in the web app.";
      return {
        content: [{ type: "text", text }],
        structuredContent: {
          created: false,
          jobId: null,
          duplicateJobId: result.duplicateOf?.id ?? null,
          autoMatchPerformed: false,
        },
      };
    }

    const autoMatchMessage = input.autoMatch
      ? " Automatic MCP matching is disabled; no resume content was returned."
      : "";
    return {
      content: [{ type: "text", text: result.message + autoMatchMessage }],
      structuredContent: {
        created: true,
        jobId: result.jobId,
        duplicateJobId: null,
        autoMatchPerformed: false,
      },
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
      structuredContent: {
        created: false,
        jobId: null,
        duplicateJobId: null,
        autoMatchPerformed: false,
      },
    };
  }
}
