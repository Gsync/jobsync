"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { JobStatus } from "@/models/job.model";
import { revalidatePath } from "next/cache";
import { requireUser } from "../shared";
import { changeJobStatus } from "@/lib/jobs/timeline";

export const updateJobStatus = async (
  jobId: string,
  status: JobStatus,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const job = await changeJobStatus({
      jobId,
      userId: user.id,
      statusId: status.id,
    });

    revalidatePath("/dashboard");
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to update job status.";
    return handleError(error, msg);
  }
};

// Sequential on purpose: changeJobStatus opens a transaction per job, and
// SQLite has a single writer, so running them in parallel would only contend.
export const updateJobsStatus = async (
  jobIds: string[],
  status: JobStatus,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    const ids = [...new Set(jobIds.filter(Boolean))];
    if (ids.length === 0) return { success: true, count: 0 };

    for (const jobId of ids) {
      await changeJobStatus({
        jobId,
        userId: user.id,
        statusId: status.id,
      });
    }

    revalidatePath("/dashboard");
    return { success: true, count: ids.length };
  } catch (error) {
    const msg = "Failed to update job statuses.";
    return handleError(error, msg);
  }
};

export const saveJobMatchResult = async (
  jobId: string,
  matchScore: number,
  matchData: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await prisma.job.update({
      where: { id: jobId, userId: user.id },
      data: { matchScore, matchData },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to save match result.";
    return handleError(error, msg);
  }
};
