import prisma from "@/lib/db";

export { sortStages } from "@/lib/jobs/sortStages";

// Not a "use server" module: queries.ts, mutations.ts, interviewers.ts and
// prep.ts all use these, and exporting them from any of those would make each
// one a callable server-action endpoint.

export const STAGE_DETAIL_INCLUDE = {
  StageType: { include: { Status: true } },
  interviewers: {
    include: {
      Contact: {
        select: {
          id: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          linkedinUrl: true,
          lastContactedAt: true,
          Company: { select: { id: true, label: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
  prepQuestions: {
    include: {
      Question: { select: { id: true, question: true, answer: true, tags: true } },
    },
    orderBy: { createdAt: "asc" as const },
  },
};

export type StageOwnerRow = {
  id: string;
  jobId: string;
  occurredAt: Date | null;
  isCurrent: boolean;
  StageType: { id: string; label: string; statusId: string; Status: { value: string } };
};

// JobStage has no ownership column, so the chain is the only check there is.
export async function assertStageOwned(
  stageId: string,
  userId: string,
): Promise<StageOwnerRow> {
  const stage = await prisma.jobStage.findFirst({
    where: { id: stageId, Job: { userId } },
    select: {
      id: true,
      jobId: true,
      occurredAt: true,
      isCurrent: true,
      StageType: {
        select: {
          id: true,
          label: true,
          statusId: true,
          Status: { select: { value: true } },
        },
      },
    },
  });
  if (!stage) throw new Error("Stage not found");
  return stage;
}

// The gate is on stage KIND and never on stage timing: preparing for an
// interview a week out is the primary case (spec decision 10).
export function assertInterviewStage(stage: StageOwnerRow): void {
  if (stage.StageType.Status.value !== "interview") {
    throw new Error(
      `"${stage.StageType.label}" is not an interview stage, so it has no interviewers or prep list.`,
    );
  }
}
