"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { createJobRecord } from "@/lib/jobs/createJobRecord";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "../shared";

type JobRefs = {
  jobTitleId?: string | null;
  companyId?: string | null;
  locationId?: string | null;
  jobSourceId?: string | null;
  resumeId?: string | null;
  coverLetterId?: string | null;
  tagIds?: string[];
};

// Foreign keys prove a row exists, not that the caller owns it, so every
// referenced id is counted against the caller before it is attached.
const assertJobRefsOwned = async (userId: string, refs: JobRefs) => {
  const owned = { createdBy: userId };
  const inProfile = { profile: { userId } };
  const tagIds = [...new Set(refs.tagIds ?? [])];

  const [title, company, location, source, resume, coverLetter, tags] =
    await Promise.all([
      refs.jobTitleId
        ? prisma.jobTitle.count({ where: { id: refs.jobTitleId, ...owned } })
        : 1,
      refs.companyId
        ? prisma.company.count({ where: { id: refs.companyId, ...owned } })
        : 1,
      refs.locationId
        ? prisma.location.count({ where: { id: refs.locationId, ...owned } })
        : 1,
      refs.jobSourceId
        ? prisma.jobSource.count({ where: { id: refs.jobSourceId, ...owned } })
        : 1,
      refs.resumeId
        ? prisma.resume.count({ where: { id: refs.resumeId, ...inProfile } })
        : 1,
      refs.coverLetterId
        ? prisma.coverLetter.count({
            where: { id: refs.coverLetterId, ...inProfile },
          })
        : 1,
      tagIds.length > 0
        ? prisma.tag.count({ where: { id: { in: tagIds }, ...owned } })
        : 0,
    ]);

  if (title === 0) throw new Error("Job title not found");
  if (company === 0) throw new Error("Company not found");
  if (location === 0) throw new Error("Location not found");
  if (source === 0) throw new Error("Job source not found");
  if (resume === 0) throw new Error("Resume not found");
  if (coverLetter === 0) throw new Error("Cover letter not found");
  if (tags !== tagIds.length) throw new Error("Tag not found");
};

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
      fundingStatus,
      dueDate,
      dateApplied,
      jobDescription,
      jobUrl,
      applied,
      resume,
      coverLetter,
      tags,
    } = data;

    await assertJobRefsOwned(user.id, {
      jobTitleId: title,
      companyId: company,
      locationId: location,
      jobSourceId: source,
      resumeId: resume,
      coverLetterId: coverLetter,
      tagIds: tags,
    });

    const job = await createJobRecord({
      jobTitleId: title,
      companyId: company,
      locationId: location,
      statusId: status,
      jobSourceId: source,
      salaryRange: salaryRange || null,
      fundingStatus: fundingStatus || null,
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
      fundingStatus,
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

    const current = await prisma.job.findFirst({
      where: { id, userId: user.id },
      select: {
        jobTitleId: true,
        companyId: true,
        locationId: true,
        jobSourceId: true,
        resumeId: true,
        coverLetterId: true,
        tags: { select: { id: true } },
      },
    });
    if (!current) {
      throw new Error("Job not found");
    }

    // Only newly attached ids are checked: migration 20260212202940 gave every
    // JobSource to the first user, so other users' older jobs must stay editable.
    const changed = (next?: string, prev?: string | null) =>
      next !== prev ? next : undefined;
    const currentTagIds = new Set(current.tags.map((tag) => tag.id));
    await assertJobRefsOwned(user.id, {
      jobTitleId: changed(title, current.jobTitleId),
      companyId: changed(company, current.companyId),
      locationId: changed(location, current.locationId),
      jobSourceId: changed(source, current.jobSourceId),
      resumeId: changed(resume, current.resumeId),
      coverLetterId: changed(coverLetter, current.coverLetterId),
      tagIds: tagIds.filter((tagId) => !currentTagIds.has(tagId)),
    });

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
        fundingStatus: fundingStatus || null,
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
