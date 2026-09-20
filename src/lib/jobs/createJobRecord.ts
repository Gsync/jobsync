import prisma from "@/lib/db";
import { resolveStageTypeForStatusId } from "@/lib/jobs/resolve";

type StageClient = {
  jobStage: { create: (args: any) => Promise<any> };
};

// The nested payload that writes the job and its first stage as one statement,
// so a job can never commit without its timeline. The stage type is resolved
// BEFORE the create on purpose: a nested create is an implicit transaction,
// and the resolver writes through the base client (D4).
export async function firstStageCreate(
  statusId: string,
  userId: string,
  occurredAt: Date,
) {
  const stageTypeId = await resolveStageTypeForStatusId(statusId, userId);
  return { create: { stageTypeId, occurredAt, isCurrent: true } };
}

// The separate-statement form, still used by the dev-only mock generator.
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
  const stages = await firstStageCreate(fields.statusId, fields.userId, createdAt);
  return await prisma.job.create({
    data: {
      ...rest,
      createdAt,
      ...(tagIds.length > 0 ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
      stages,
    },
  });
}
