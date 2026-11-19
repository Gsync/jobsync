import prisma from "@/lib/db";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

export async function handleGetAnalytics(
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
    const [total, appliedCount, grouped, statuses, byCompany, bySource, recent] = await Promise.all([
      prisma.job.count({ where: { userId } }),
      prisma.job.count({ where: { userId, applied: true } }),
      prisma.job.groupBy({ by: ["statusId"], where: { userId }, _count: { _all: true } }),
      prisma.jobStatus.findMany({ select: { id: true, value: true } }),
      prisma.job.groupBy({ by: ["companyId"], where: { userId }, _count: { _all: true } }),
      prisma.job.groupBy({ by: ["jobSourceId"], where: { userId }, _count: { _all: true } }),
      prisma.job.count({ where: { userId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } }),
    ]);

    const byId = Object.fromEntries(statuses.map((s: any) => [s.id, s.value]));
    const statusLines = grouped
      .map((g: any) => `- ${byId[g.statusId] ?? g.statusId}: ${g._count._all}`)
      .sort();

    // Resolve company names
    const companyIds = byCompany.map((c: any) => c.companyId).filter(Boolean);
    const companies = companyIds.length
      ? await prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, label: true } })
      : [];
    const companyNameById = Object.fromEntries(companies.map((c: any) => [c.id, c.label]));
    const companyLines = byCompany.map((c: any) => `- ${companyNameById[c.companyId] ?? c.companyId}: ${c._count._all}`);

    const sourceIds = bySource.map((s: any) => s.jobSourceId).filter(Boolean);
    const sources = sourceIds.length
      ? await prisma.jobSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, label: true } })
      : [];
    const sourceLabelById = Object.fromEntries(sources.map((s: any) => [s.id, s.label]));
    const sourceLines = bySource.map((s: any) => `- ${sourceLabelById[s.jobSourceId] ?? "(none)"}: ${s._count._all}`);

    const text = [
      `Total jobs: ${total}`,
      `Applied: ${appliedCount}`,
      `Added in last 30 days: ${recent}`,
      "By status:",
      statusLines.length ? statusLines.join("\n") : "  (none)",
      "Top companies:",
      companyLines.length ? companyLines.join("\n") : "  (none)",
      "Top sources:",
      sourceLines.length ? sourceLines.join("\n") : "  (none)",
    ].join("\n");

    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}