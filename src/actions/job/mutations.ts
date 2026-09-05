"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { createJobRecord } from "@/lib/jobs/createJobRecord";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../shared";

export const addJob = async (
  data: z.infer<typeof AddJobFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const {
      title,
      company,
      location,
      type,
      workplaceType,
      status,
      source,
      salaryRange,
      dueDate,
      dateApplied,
      jobDescription,
      jobUrl,
      applied,
      resume,
      coverLetter,
      tags,
    } = data;

    const job = await createJobRecord({
      jobTitleId: title,
      companyId: company,
      locationId: location,
      statusId: status,
      jobSourceId: source,
      salaryRange: salaryRange || null,
      dueDate,
      appliedDate: dateApplied,
      description: jobDescription,
      jobType: type,
      workplaceType,
      userId: user.id,
      jobUrl,
      applied,
      resumeId: resume,
      coverLetterId: coverLetter,
      tagIds: tags ?? [],
    });
    revalidatePath("/dashboard");
    return { success: true, data: job };
  } catch (error) {
    const msg = "Failed to create job. ";
    return handleError(error, msg);
  }
};

export const updateJob = async (
  data: z.infer<typeof AddJobFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();
    if (!data.id) {
      throw new Error("Job id is required");
    }

    const {
      id,
      title,
      company,
      location,
      type,
      workplaceType,
      status,
      source,
      salaryRange,
      dueDate,
      dateApplied,
      jobDescription,
      jobUrl,
      applied,
      resume,
      coverLetter,
      tags,
    } = data;

    const tagIds = tags ?? [];

    const job = await prisma.job.update({
      where: {
        id,
        userId: user.id,
      },
      data: {
        jobTitleId: title,
        companyId: company,
        locationId: location,
        statusId: status,
        jobSourceId: source,
        salaryRange: salaryRange || null,
        createdAt: new Date(),
        dueDate: dueDate,
        appliedDate: dateApplied,
        description: jobDescription,
        jobType: type,
        workplaceType,
        jobUrl,
        applied,
        resumeId: resume,
        coverLetterId: coverLetter,
        tags: { set: tagIds.map((id) => ({ id })) },
      },
    });
    revalidatePath("/dashboard");
    return { success: true, data: job };
  } catch (error) {
    const msg = "Failed to update job. ";
    return handleError(error, msg);
  }
};

export const deleteJobById = async (
  jobId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const res = await prisma.job.delete({
      where: {
        id: jobId,
        userId: user.id,
      },
    });
    revalidatePath("/dashboard");
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job.";
    return handleError(error, msg);
  }
};
