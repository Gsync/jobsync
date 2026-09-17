import { z } from "zod";
import prisma from "@/lib/db";
import { followUpDueDate } from "@/lib/outreach/follow-up";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export async function handleLogOutreach(
  input: z.infer<typeof McpLogOutreachSchema>,
  userId: string,
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return { content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }] };
  }
  try {
    if (!input.jobId && !input.contactName) {
      return { content: [{ type: "text", text: "Error: supply jobId or contactName." }] };
    }
    if (input.jobId) {
      const own = await prisma.job.count({ where: { id: input.jobId, userId } });
      if (!own) return { content: [{ type: "text", text: "Error: application not found." }] };
    }
    let contactId: string | undefined;
    if (input.contactName) {
      const existing = await prisma.contact.findFirst({
        where: { createdBy: userId, name: input.contactName },
      });
      contactId = existing?.id ?? (
        await prisma.contact.create({
          data: { createdBy: userId, name: input.contactName },
        })
      ).id;
    }
    const sentAt = input.sentAt ? new Date(input.sentAt) : new Date();
    const row = await prisma.outreach.create({
      data: {
        jobId: input.jobId,
        contactId,
        subject: input.subject,
        body: input.body,
        paperCited: input.paperCited,
        sentAt,
        followUpDue: followUpDueDate(sentAt),
      },
    });
    return {
      content: [{
        type: "text",
        text: `Outreach logged (${row.id}). Follow-up due ${row.followUpDue?.toISOString().slice(0, 10)}.`,
      }],
    };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${(err as Error)?.message ?? "Unknown error"}` }] };
  }
}

// Schema lives with the handler (not mcp.schema.ts) to keep this diff additive.
export const McpLogOutreachInputShape = {
  jobId: z.string().min(1).optional().describe("The id of the application (from add_job / find_job)."),
  contactName: z.string().min(1).optional().describe("Professor/recruiter name. Created if new."),
  subject: z.string().optional().describe("Email subject."),
  body: z.string().optional().describe("Email body or excerpt."),
  paperCited: z.string().optional().describe("Which paper the email referenced."),
  sentAt: z.string().datetime({ offset: true }).optional().describe("When sent (ISO-8601). Defaults to now."),
};

export const McpLogOutreachSchema = z.object(McpLogOutreachInputShape);
