import prisma from "@/lib/db";

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
}) {
  const { tagIds = [], ...rest } = fields;
  return prisma.job.create({
    data: {
      ...rest,
      createdAt: new Date(),
      ...(tagIds.length > 0 ? { tags: { connect: tagIds.map((id) => ({ id })) } } : {}),
    },
  });
}
