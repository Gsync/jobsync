"use server";
import prisma from "@/lib/db";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { z } from "zod";

export const getStatusList = async (): Promise<any | undefined> => {
  try {
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    const msg = "Failed to fetch status list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobSourceList = async (): Promise<any | undefined> => {
  try {
    const list = await prisma.jobSource.findMany();
    return list;
  } catch (error) {
    const msg = "Failed to fetch job source list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobLocationList = async (): Promise<any | undefined> => {
  try {
    const list = await prisma.location.findMany();
    return list;
  } catch (error) {
    const msg = "Failed to fetch job location list. ";
    console.error(msg, error);
    throw new Error(msg);
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
      ? {
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
          Company: true,
          Status: true,
          Location: true,
          dueDate: true,
          appliedDate: true,
          description: false,
        },
        orderBy: {
          appliedDate: "desc",
        },
      }),
      prisma.job.count({
        where: {
          userId: user.id,
          ...filterBy,
        },
      }),
    ]);
    return { data, total };
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

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

    const job = prisma.job.findUnique({
      where: {
        id: jobId,
      },
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
      },
    });
    return job;
  } catch (error) {
    const msg = "Failed to fetch job details. ";
    console.error(msg, error);
    throw new Error(msg);
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

    const location = await prisma.location.create({
      data: { label, value, createdBy: user.id },
    });

    return location;
  } catch (error) {
    const msg = "Failed to create job location. ";
    console.error(msg, error);
    throw new Error(msg);
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
      },
    });

    return job;
  } catch (error) {
    const msg = "Failed to create job. ";
    console.error(msg, error);
    throw new Error(msg);
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
      },
    });

    return job;
  } catch (error) {
    const msg = "Failed to update job. ";
    console.error(msg, error);
    throw new Error(msg);
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

    const res = prisma.job.delete({
      where: {
        id: jobId,
        userId: user.id,
      },
    });
    return res;
  } catch (error) {
    const msg = "Failed to delete job.";
    console.error(msg, error);
    throw new Error(msg);
  }
};
