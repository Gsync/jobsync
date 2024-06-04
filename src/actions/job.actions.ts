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

export const getJobsList = async (): Promise<any | undefined> => {
  try {
    const list = await prisma.job.findMany({
      include: {
        JobSource: true,
        JobTitle: true,
        Company: true,
        Status: true,
        Location: true,
      },
    });
    return list;
  } catch (error) {
    const msg = "Failed to fetch jobs list. ";
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

    const job = await prisma.job.create({
      data: {
        jobTitleId: data.title,
        companyId: data.company,
        locationId: data.location,
        statusId: data.status,
        jobSourceId: data.source,
        salaryRange: data.salaryRange,
        createdAt: new Date(),
        dueDate: data.dueDate,
        appliedDate: data.dateApplied,
        description: data.jobDescription,
        jobType: "fulltime",
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
