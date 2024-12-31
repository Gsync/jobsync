"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { JOB_TYPES, JobStatus } from "@/models/job.model";
import { getCurrentUser } from "@/utils/user.utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const getStatusList = async (): Promise<any | undefined> => {
  try {
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    const msg = "Failed to fetch status list. ";
    return handleError(error, msg);
  }
};

export const getJobSourceList = async (): Promise<any | undefined> => {
  try {
    const list = await prisma.jobSource.findMany();
    return list;
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    return handleError(error, msg);
  }
};

export const getJobsList = async (
  page = 1,
  limit = 10,
  filter?: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const filterBy = filter
      ? filter === Object.keys(JOB_TYPES)[1]
        ? {
            jobType: filter,
          }
        : {
            Status: {
              value: filter,
            },
          }
      : {};
    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          userId: user.id,
          ...filterBy,
        },
        skip,
        take: limit,
        select: {
          id: true,
          JobSource: true,
          JobTitle: true,
          jobType: true,
          Company: true,
          Status: true,
          Location: true,
          dueDate: true,
          appliedDate: true,
          description: false,
          Resume: true,
        },
        orderBy: {
          createdAt: "desc",
          // appliedDate: "desc",
        },
      }),
      prisma.job.count({
        where: {
          userId: user.id,
          ...filterBy,
        },
      }),
    ]);
    return { success: true, data, total };
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    return handleError(error, msg);
  }
};

export async function* getJobsIterator(filter?: string, pageSize = 200) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }
  let page = 1;
  let fetchedCount = 0;

  while (true) {
    const skip = (page - 1) * pageSize;
    const filterBy = filter
      ? filter === Object.keys(JOB_TYPES)[1]
        ? { status: filter }
        : { type: filter }
      : {};

    const chunk = await prisma.job.findMany({
      where: {
        userId: user.id,
        ...filterBy,
      },
      select: {
        id: true,
        createdAt: true,
        JobSource: true,
        JobTitle: true,
        jobType: true,
        Company: true,
        Status: true,
        Location: true,
        dueDate: true,
        applied: true,
        appliedDate: true,
      },
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
    });

    if (!chunk.length) {
      break;
    }

    yield chunk;
    fetchedCount += chunk.length;
    page++;
  }
}

export const getJobDetails = async (
  jobId: string
): Promise<any | undefined> => {
  try {
    if (!jobId) {
      throw new Error("Please provide job id");
    }
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
      },
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
        Resume: {
          include: {
            File: true,
          },
        },
      },
    });
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to fetch job details. ";
    return handleError(error, msg);
  }
};

export const createLocation = async (
  label: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = label.trim().toLowerCase();

    if (!value) {
      throw new Error("Please provide location name");
    }

    const location = await prisma.location.create({
      data: { label, value, createdBy: user.id },
    });

    return { data: location, success: true };
  } catch (error) {
    const msg = "Failed to create job location. ";
    return handleError(error, msg);
  }
};

export const addJob = async (
  data: z.infer<typeof AddJobFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const {
      title,
      company,
      location,
      type,
      status,
      source,
      salaryRange,
      dueDate,
      dateApplied,
      jobDescription,
      jobUrl,
      applied,
      resume,
    } = data;

    const job = await prisma.job.create({
      data: {
        jobTitleId: title,
        companyId: company,
        locationId: location,
        statusId: status,
        jobSourceId: source,
        salaryRange: salaryRange,
        createdAt: new Date(),
        dueDate: dueDate,
        appliedDate: dateApplied,
        description: jobDescription,
        jobType: type,
        userId: user.id,
        jobUrl,
        applied,
        resumeId: resume,
      },
    });
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to create job. ";
    return handleError(error, msg);
  }
};

export const updateJob = async (
  data: z.infer<typeof AddJobFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    if (!data.id || user.id != data.userId) {
      throw new Error("Id is not provide or no user privilages");
    }

    const {
      id,
      title,
      company,
      location,
      type,
      status,
      source,
      salaryRange,
      dueDate,
      dateApplied,
      jobDescription,
      jobUrl,
      applied,
      resume,
    } = data;

    const job = await prisma.job.update({
      where: {
        id,
      },
      data: {
        jobTitleId: title,
        companyId: company,
        locationId: location,
        statusId: status,
        jobSourceId: source,
        salaryRange: salaryRange,
        createdAt: new Date(),
        dueDate: dueDate,
        appliedDate: dateApplied,
        description: jobDescription,
        jobType: type,
        jobUrl,
        applied,
        resumeId: resume,
      },
    });
    // revalidatePath("/dashboard/myjobs", "page");
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to update job. ";
    return handleError(error, msg);
  }
};

export const updateJobStatus = async (
  jobId: string,
  status: JobStatus
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const dataToUpdate = () => {
      switch (status.value) {
        case "applied":
          return {
            statusId: status.id,
            applied: true,
            appliedDate: new Date(),
          };
        case "interview":
          return {
            statusId: status.id,
            applied: true,
          };
        default:
          return {
            statusId: status.id,
          };
      }
    };

    const job = await prisma.job.update({
      where: {
        id: jobId,
        userId: user.id,
      },
      data: dataToUpdate(),
    });
    return { job, success: true };
  } catch (error) {
    const msg = "Failed to update job status.";
    return handleError(error, msg);
  }
};

export const deleteJobById = async (
  jobId: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.job.delete({
      where: {
        id: jobId,
        userId: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete job.";
    return handleError(error, msg);
  }
};
