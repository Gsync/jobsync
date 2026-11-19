import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

// List the caller's companies (created by them). Supports free-text search
// across name and ATS token. Returns id, label, value, watched flag, and the
// count of jobs applied at each company.
export async function handleListCompanies(
  input: { search?: string; limit?: number; offset?: number },
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
    const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);
    const offset = Math.max(input.offset ?? 0, 0);

    const where: any = { createdBy: userId };
    if (input.search) {
      where.OR = [
        { label: { contains: input.search } },
        { value: { contains: input.search } },
        { atsToken: { contains: input.search } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        select: {
          id: true,
          label: true,
          value: true,
          watched: true,
          atsProvider: true,
          atsToken: true,
          _count: { select: { jobsApplied: true } },
        },
        orderBy: { label: "asc" },
        skip: offset,
        take: limit,
      }),
      prisma.company.count({ where }),
    ]);

    if (companies.length === 0) {
      return {
        content: [{ type: "text", text: `No companies found (total: ${total}).` }],
      };
    }

    const lines = companies.map((c: any) => {
      const watched = c.watched ? " (watched)" : "";
      const ats = c.atsProvider ? ` [${c.atsProvider}${c.atsToken ? `:${c.atsToken}` : ""}]` : "";
      return `- ${c.label} (id: ${c.id}, value: ${c.value}) — ${c._count?.jobsApplied ?? 0} job(s)${watched}${ats}`;
    });

    let text = `Found ${companies.length} of ${total} company/companies (offset ${offset}):\n${lines.join("\n")}`;
    if (offset + companies.length < total) {
      text += `\n\nMore available — call list_companies with offset ${offset + companies.length}.`;
    }
    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}