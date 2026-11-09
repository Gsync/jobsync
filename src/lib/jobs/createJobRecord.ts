import prisma from "@/lib/db";
import { initialTimelineForNewJob } from "@/lib/jobs/timeline";

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
  // Resolved before the create: the nested stage write is one implicit
  // transaction, and the resolver writes through the base client (D4).
  const { stages, jobFields } = await initialTimelineForNewJob({
    statusId: fields.statusId,
    userId: fields.userId,
    occurredAt: createdAt,
    appliedDate: fields.appliedDate,
  });
  return await prisma.job.create({
    data: {
      ...rest,
      ...jobFields,
      createdAt,
      ...(tagIds.length > 0 ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
      stages,
    },
  });
}
