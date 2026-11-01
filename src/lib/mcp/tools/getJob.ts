import prisma from "@/lib/db";
import { getJobCategoryLabel } from "@/models/job.model";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";

// Fetch the full record for a single job by id, scoped to the caller. Returns
// every field an agent needs to review or enrich a posting (description,
// tags, contacts, stages, match data, etc.).
export async function handleGetJob(
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
      include: {
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
        JobSource: true,
        tags: true,
        Resume: { select: { id: true, title: true } },
        CoverLetter: { select: { id: true, title: true } },
        contactLinks: {
          include: { Contact: true, Role: true },
        },
        stages: { include: { StageType: true } },
      },
    });

    if (!job) {
      return {
        content: [{ type: "text", text: `Job not found: ${input.jobId}` }],
      };
    }

    const j: any = job;
    const title = j.JobTitle?.label ?? "(untitled)";
    const company = j.Company?.label ?? "(unknown)";
    const status = j.Status?.value ?? "unknown";
    const location = j.Location?.label ?? "—";
    const source = j.JobSource?.label ?? "—";
    const tags = j.tags?.length
      ? j.tags.map((t: any) => t.label).join(", ")
      : "none";
    const match = j.matchScore != null ? `${j.matchScore}%` : "not scored";
    const contacts = j.contactLinks?.length
      ? j.contactLinks
          .map((c: any) => `${c.Contact?.name ?? "?"} (${c.Role?.label ?? c.Role?.value ?? "contact"})`)
          .join(", ")
      : "none";
    const stages = j.stages?.length
      ? j.stages
          .map((s: any) => `${s.StageType?.label ?? s.StageType?.value ?? "stage"}${s.isCurrent ? " (current)" : ""}`)
          .join(", ")
      : "none";

    const text = [
      `Job: ${title} @ ${company}`,
      `id: ${j.id}`,
      `status: ${status}`,
      `location: ${location}`,
      `source: ${source}`,
      `job type: ${j.jobType ?? "—"}`,
      `workplace: ${j.workplaceType ?? "—"}`,
      `category: ${j.jobCategory ? getJobCategoryLabel(j.jobCategory) : "—"}`,
      `salary: ${j.salaryRange ?? "—"}`,
      `applied: ${j.applied}${j.appliedDate ? ` (${new Date(j.appliedDate).toISOString()})` : ""}`,
      `due date: ${j.dueDate ? new Date(j.dueDate).toISOString() : "—"}`,
      `match: ${match}`,
      `tags: ${tags}`,
      `contacts: ${contacts}`,
      `stages: ${stages}`,
      `resume: ${j.Resume?.title ?? "none"} (${j.resumeId ?? "—"})`,
      `cover letter: ${j.CoverLetter?.title ?? "none"}`,
      `created via: ${j.createdVia ?? "web app"}`,
      `created at: ${new Date(j.createdAt).toISOString()}`,
      `url: ${j.jobUrl ?? "—"}`,
      "",
      `description:\n${j.description || "(none)"}`,
    ].join("\n");

    return { content: [{ type: "text", text }] };
  } catch (err: any) {
    return {
      content: [{ type: "text", text: `Error: ${err?.message ?? "Unknown error"}` }],
    };
  }
}