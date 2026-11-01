import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

// Delete a job owned by the caller. Only jobs created through MCP (createdVia
// set) can be deleted this way, matching update_job's ownership rule, so an
// agent can never remove a record the user created in the web app.
export async function handleDeleteJob(
  input: { jobId: string },
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
    const job = await prisma.job.findFirst({
      where: { id: input.jobId, userId },
      select: { id: true, createdVia: true, JobTitle: { select: { label: true } }, Company: { select: { label: true } } },
    });

    if (!job) {
      return {
        content: [{ type: "text", text: `Job not found: ${input.jobId}` }],
      };
    }

    if (!job.createdVia) {
      return {
        content: [
          {
            type: "text",
            text: `This job was created in the web app and cannot be deleted via MCP — delete it there instead.`,
          },
        ],
      };
    }

    await prisma.job.delete({ where: { id: input.jobId } });

    const title = job.JobTitle?.label ?? "(untitled)";
    const company = job.Company?.label ?? "(unknown)";
    return {
      content: [{ type: "text", text: `Deleted job "${title}" @ ${company} (id: ${input.jobId}).` }],
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}