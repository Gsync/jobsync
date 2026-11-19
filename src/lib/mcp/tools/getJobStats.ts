import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

// Aggregate counts of the caller's jobs by status, plus total and applied
// counts. Useful for an agent to give a quick pipeline overview.
export async function handleGetJobStats(
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
    const [total, appliedCount, grouped, statuses] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.count({ where: { userId, applied: true } }),
      prisma.job.groupBy({
        by: ["statusId"],
        where: { userId },
        _count: { _all: true },
      }),
      prisma.jobStatus.findMany({
        select: { id: true, value: true },
      }),
    ]);

    const byId = Object.fromEntries(statuses.map((s: any) => [s.id, s.value]));
    const lines = grouped
      .map((g: any) => `- ${byId[g.statusId] ?? g.statusId}: ${g._count._all}`)
      .sort();

    const text = [
      `Total jobs: ${total}`,
      `Applied: ${appliedCount}`,
      "By status:",
      lines.length ? lines.join("\n") : "  (none)",
    ].join("\n");

    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}