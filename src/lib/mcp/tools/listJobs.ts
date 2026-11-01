import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { getJobCategoryLabel } from "@/models/job.model";

// Compact, agent-friendly listing of the caller's saved jobs. Supports free-text
// search across title/company/location/description and filters on status,
// company, and applied flag. Returns one line per job plus a total count and
// a "more available" hint so the agent can page through large lists.
export async function handleListJobs(
  input: {
    search?: string;
    status?: string;
    company?: string;
    applied?: boolean;
    limit?: number;
    offset?: number;
  },
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
    const limit = Math.min(Math.max(input.limit ?? 25, 1), 100);
    const offset = Math.max(input.offset ?? 0, 0);

    const and: any[] = [];
    if (input.status) {
      and.push({ Status: { value: { contains: input.status } } });
    }
    if (input.company) {
      and.push({ Company: { label: { contains: input.company } } });
    }
    if (typeof input.applied === "boolean") {
      and.push({ applied: input.applied });
    }
    if (input.search) {
      and.push({
        OR: [
          { JobTitle: { label: { contains: input.search } } },
          { Company: { label: { contains: input.search } } },
          { Location: { label: { contains: input.search } } },
          { JobSource: { label: { contains: input.search } } },
          { description: { contains: input.search } },
        ],
      });
    }

    const where: any = { userId };
    if (and.length) where.AND = and;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
          JobTitle: { select: { label: true } },
          Company: { select: { label: true } },
          Status: { select: { value: true } },
          Location: { select: { label: true } },
          jobType: true,
          workplaceType: true,
          jobCategory: true,
          applied: true,
          appliedDate: true,
          dueDate: true,
          salaryRange: true,
          matchScore: true,
          matchData: true,
          createdVia: true,
          jobUrl: true,
          tags: { select: { label: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.job.count({ where }),
    ]);

    if (jobs.length === 0) {
      return {
        content: [{ type: "text", text: `No jobs found (total matching: ${total}).` }],
      };
    }

    const lines = jobs.map((j: any) => {
      const title = j.JobTitle?.label ?? "(untitled)";
      const company = j.Company?.label ?? "(unknown)";
      const status = j.Status?.value ?? "unknown";
      const location = j.Location?.label ?? "—";
      const match = j.matchScore != null ? `${j.matchScore}%` : "—";
      const category = j.jobCategory ? getJobCategoryLabel(j.jobCategory) : "—";
      const tags = j.tags?.length
        ? j.tags.map((t: any) => t.label).join(", ")
        : "none";
      const url = j.jobUrl ? ` url: ${j.jobUrl}` : "";
      return `- ${title} @ ${company} (id: ${j.id}) — status: ${status}, category: ${category}, location: ${location}, applied: ${j.applied}, match: ${match}, tags: ${tags}${url}`;
    });

    let text = `Found ${jobs.length} of ${total} job(s) (offset ${offset}):\n${lines.join("\n")}`;
    if (offset + jobs.length < total) {
      text += `\n\nMore available — call list_jobs with offset ${offset + jobs.length}.`;
    }
    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}