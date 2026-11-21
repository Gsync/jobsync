import prisma from "@/lib/db";
import type { JobResponse } from "@/models/job.model";

export type JobLookup =
  | { status: "ok"; job: JobResponse }
  | { status: "no_job" };

// There is no lookup by name here on purpose: match_job scores the job the
// user is looking at, so the id comes from page context and never from the
// model. pageContext is client-supplied, which is why userId is in the where
// clause rather than checked afterwards.
export async function resolveJobForAgent(
  userId: string,
  pageJobId?: string,
): Promise<JobLookup> {
  if (!pageJobId) return { status: "no_job" };

  const job = await prisma.job.findFirst({
    where: { id: pageJobId, userId },
    include: { JobTitle: true, Company: true, Location: true },
  });
  if (!job) return { status: "no_job" };

  // Prisma's generated shape is structurally what convertJobToText reads but
  // is not nominally job.model's JobResponse — same cast as resumeLookup.
  return { status: "ok", job: job as unknown as JobResponse };
}
