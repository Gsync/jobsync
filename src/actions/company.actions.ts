"use server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

export const getCompanyList = async (
  page = 1,
  limit = 10,
  countBy?: string
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      prisma.company.findMany({
        where: {
          createdBy: user.id,
        },
        skip,
        take: limit,
        ...(countBy
          ? {
              select: {
                label: true,
                value: true,
                _count: {
                  select: {
                    jobsApplied: {
                      where: {
                        Status: {
                          value: countBy,
                        },
                      },
                    },
                  },
                },
              },
            }
          : {}),
        //   orderBy: {
        //     jobsApplied: {
        //       _count: "desc",
        //     },
        //   },
      }),
      prisma.company.count({
        where: {
          createdBy: user.id,
        },
      }),
    ]);
    return { data, total };
  } catch (error) {
    const msg = "Failed to fetch company list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const getAllCompanies = async (): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const comapnies = await prisma.company.findMany({
      where: {
        createdBy: user.id,
      },
    });
    return comapnies;
  } catch (error) {
    const msg = "Failed to fetch all companies. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};

export const createCompany = async (
  label: string,
  logoUrl?: string
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
      update: { label, value, logoUrl },
      create: { label, value, logoUrl, createdBy: user.id },
    });

    return upsertedName;
  } catch (error) {
    const msg = "Failed to create company. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
