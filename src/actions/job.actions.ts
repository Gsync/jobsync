import "server-only";
import prisma from "@/lib/db";

export const getStatusList = async (): Promise<any | undefined> => {
  try {
    const statuses = await prisma.jobStatus.findMany();
    return statuses;
  } catch (error) {
    console.error("Failed to fetch status list:", error);
    throw new Error("Failed to fetch status list.");
  }
};

export const getCompanyList = async (): Promise<any | undefined> => {
  try {
    const companies = await prisma.company.findMany();
    return companies;
  } catch (error) {
    console.error("Failed to fetch company list:", error);
    throw new Error("Failed to fetch company list.");
  }
};
