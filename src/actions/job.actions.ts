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

export const getCompanyList = async (): Promise<any | undefined> => {
  try {
    const companies = await prisma.company.findMany();
    return companies;
  } catch (error) {
    const msg = "Failed to fetch company list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getJobTitleList = async (): Promise<any | undefined> => {
  try {
    const list = await prisma.jobTitle.findMany();
    return list;
  } catch (error) {
    const msg = "Failed to fetch job title list. ";
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
  limit = 10
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;
    const [data, total] = await Promise.all([
      prisma.job.findMany({
        where: {
          userId: user.id,
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
          createdAt: "desc",
        },
      }),
      prisma.job.count({
        where: {
          userId: user.id,
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

export const createCompany = async (
  label: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = label.trim().toLowerCase();

    // Upsert the name (create if it does not exist, update if it exists)
    const upsertedName = await prisma.company.upsert({
      where: { value },
      update: { label },
      create: { label, value, createdBy: user.id },
    });

    return upsertedName;
  } catch (error) {
    const msg = "Failed to create company. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const createJobTitle = async (
  label: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const value = label.trim().toLowerCase();

    const upsertedTitle = await prisma.jobTitle.upsert({
      where: { value },
      update: { label },
      create: { label, value, createdBy: user.id },
    });

    return upsertedTitle;
  } catch (error) {
    const msg = "Failed to create job title. ";
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
      },
    });

    return job;
  } catch (error) {
    const msg = "Failed to create job. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
