"use server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

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
