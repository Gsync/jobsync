import prisma from "@/lib/db";
import { APP_CONSTANTS } from "@/lib/constants";
import { entityLookupValue } from "@/lib/jobs/resolve";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import type { McpListJobsInput, McpToolResult } from "@/models/mcp.schema";

export async function handleListJobs(
  input: McpListJobsInput,
  userId: string,
): Promise<McpToolResult> {
  const rateCheck = checkMcpRateLimit(userId);
  if (!rateCheck.allowed) {
    const resetSec = Math.ceil(rateCheck.resetIn / 1000);
    return {
      content: [{ type: "text", text: `Rate limit exceeded. Try again in ${resetSec}s.` }],
    };
  }

  try {
    const limit = input.limit ?? APP_CONSTANTS.MCP_LIST_JOBS_DEFAULT_LIMIT;
    const offset = input.offset ?? 0;
    // One extra row tells us whether another page exists without a count.
    const rows = await prisma.job.findMany({
      where: buildWhere(input, userId),
      select: {
        id: true,
        jobUrl: true,
        createdAt: true,
        Status: { select: { value: true } },
        JobTitle: { select: { label: true } },
        Company: { select: { label: true } },
        Location: { select: { label: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: offset,
      take: limit + 1,
    });

    const jobs = rows.slice(0, limit).map((row) => ({
      id: row.id,
      company: row.Company.label,
      title: row.JobTitle.label,
      location: row.Location?.label ?? null,
      status: row.Status.value,
      createdAt: row.createdAt.toISOString(),
      jobUrl: row.jobUrl,
    }));
    const nextOffset = rows.length > limit ? offset + limit : null;

    return {
      content: [{ type: "text", text: describe(jobs, nextOffset) }],
      structuredContent: { jobs, nextOffset },
    };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}

function buildWhere(input: McpListJobsInput, userId: string) {
  return {
    userId,
    ...(input.company && {
      Company: { value: entityLookupValue(input.company, { stripLegalSuffix: true }) },
    }),
    ...(input.status && { Status: { value: input.status } }),
    ...(input.source && { JobSource: { value: entityLookupValue(input.source) } }),
    ...(input.createdAfter && { createdAt: { gte: new Date(input.createdAfter) } }),
  };
}

function describe(
  jobs: Array<{ id: string; company: string; title: string; location: string | null; status: string; createdAt: string }>,
  nextOffset: number | null,
): string {
  if (jobs.length === 0) return "No saved jobs match these filters.";
  const lines = jobs.map(
    (j) =>
      `- ${j.id} | ${j.company} | ${j.title} | ${j.location ?? "-"} | ` +
      `${j.status} | ${j.createdAt.slice(0, 10)}`,
  );
  const more =
    nextOffset != null
      ? `\nMore jobs match — call list_jobs again with offset ${nextOffset}.`
      : "";
  return `${jobs.length} saved job(s) (id | company | title | location | status | saved):\n${lines.join("\n")}${more}`;
}
