import prisma from "@/lib/db";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";

type StageClient = {
  jobStage: { create: (args: any) => Promise<any> };
};

// There is no single choke point for job creation: the scraper and the mock
// generator write jobs directly. Each calls this so a job added after the
// backfill is never left without the timeline a backfilled job has.
export async function createFirstStage(
  client: StageClient,
  jobId: string,
  statusId: string,
  userId: string,
  occurredAt: Date,
): Promise<void> {
  const stageTypeId = await resolveStageTypeForStatusId(statusId, userId);
  await client.jobStage.create({
    data: { jobId, stageTypeId, occurredAt, isCurrent: true },
  });
}

export async function createJobRecord(fields: {
  jobTitleId: string;
  companyId: string;
  locationId?: string | null;
  statusId: string;
  jobSourceId?: string | null;
  salaryRange?: string | null;
  dueDate?: Date | null;
  appliedDate?: Date | null;
  description: string;
  jobType: string;
  workplaceType?: string | null;
  userId: string;
  jobUrl?: string | null;
  applied?: boolean;
  resumeId?: string | null;
  coverLetterId?: string | null;
  tagIds?: string[];
  createdVia?: string | null;
  descriptionCompleteness?: string | null;
}) {
  const { tagIds = [], ...rest } = fields;
  const createdAt = new Date();
  const job = await prisma.job.create({
    data: {
      ...rest,
      createdAt,
      ...(tagIds.length > 0 ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
    },
  });
  await createFirstStage(prisma, job.id, fields.statusId, fields.userId, createdAt);
  return job;
}
