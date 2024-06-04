"use server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

export const getStatusList = async (): Promise<any | undefined> => {
  try {
    console.log("GETTING STATUS LIST");
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    console.error("Failed to fetch status list:", error);
    throw new Error("Failed to fetch status list.");
  }
};

export const getCompanyList = async (): Promise<any | undefined> => {
  try {
    console.log("GETTING COMPANY LIST");

    const companies = await prisma.company.findMany();
    return companies;
  } catch (error) {
    console.error("Failed to fetch company list:", error);
    throw new Error("Failed to fetch company list.");
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
    console.error("Failed to create company: ", error);
    throw new Error("Failed to create company.");
  }
};
