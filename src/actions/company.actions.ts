"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
                id: true,
                label: true,
                value: true,
                logoUrl: true,
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
        orderBy: {
          jobsApplied: {
            _count: "desc",
          },
        },
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
    return handleError(error, msg);
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
    return handleError(error, msg);
  }
};

export const addCompany = async (
  data: z.infer<typeof AddCompanyFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { company, logoUrl } = data;

    const value = company.trim().toLowerCase();

    const companyExists = await prisma.company.findUnique({
      where: {
        value,
      },
    });

    if (companyExists) {
      throw new Error("Company already exists!");
    }

    const res = await prisma.company.create({
      data: {
        createdBy: user.id,
        value,
        label: company,
        logoUrl,
      },
    });
    revalidatePath("/dashboard/myjobs", "page");
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create company.";
    return handleError(error, msg);
  }
};

export const updateCompany = async (
  data: z.infer<typeof AddCompanyFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { id, company, logoUrl, createdBy } = data;

    if (!id || user.id != createdBy) {
      throw new Error("Id is not provided or no user privilages");
    }

    const value = company.trim().toLowerCase();

    const companyExists = await prisma.company.findUnique({
      where: {
        value,
      },
    });

    if (companyExists) {
      throw new Error("Company already exists!");
    }

    const res = await prisma.company.update({
      where: {
        id,
      },
      data: {
        value,
        label: company,
        logoUrl,
      },
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update company.";
    return handleError(error, msg);
  }
};

export const getCompanyById = async (
  companyId: string
): Promise<any | undefined> => {
  try {
    if (!companyId) {
      throw new Error("Please provide company id");
    }
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const company = await prisma.company.findUnique({
      where: {
        id: companyId,
      },
    });
    return company;
  } catch (error) {
    const msg = "Failed to fetch company by Id. ";
    console.error(msg);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};
