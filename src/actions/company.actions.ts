"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const getCompanyList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  countBy?: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const skip = (page - 1) * limit;

    const [data, total, rejectedCounts] = await Promise.all([
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
                        applied: true,
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
      countBy
        ? prisma.job.groupBy({
            by: ["companyId"],
            where: {
              userId: user.id,
              Status: { value: "rejected" },
            },
            _count: { id: true },
          })
        : Promise.resolve([]),
    ]);

    const rejectedMap = new Map(
      (rejectedCounts as { companyId: string; _count: { id: number } }[]).map(
        (r) => [r.companyId, r._count.id],
      ),
    );

    const dataWithRejected = countBy
      ? (data as any[]).map((company) => ({
          ...company,
          _count: {
            ...(company._count ?? {}),
            jobsRejected: rejectedMap.get(company.id) ?? 0,
          },
        }))
      : data;

    return { data: dataWithRejected, total };
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

const isValidImageUrl = (url: string): boolean => {
  if (!url) return true;
  if (url.startsWith("/")) return true;
  try {
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const addCompany = async (
  data: z.infer<typeof AddCompanyFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { company, logoUrl } = data;

    // Validate image URL
    if (logoUrl && !isValidImageUrl(logoUrl)) {
      throw new Error(
        "Invalid logo URL. Only http and https protocols are allowed.",
      );
    }

    const value = company.trim().toLowerCase();

    const companyExists = await prisma.company.findFirst({
      where: {
        value,
        createdBy: user.id,
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
  data: z.infer<typeof AddCompanyFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { id, company, logoUrl, createdBy } = data;

    if (!id) {
      throw new Error("Company id is required");
    }

    // Validate image URL
    if (logoUrl && !isValidImageUrl(logoUrl)) {
      throw new Error(
        "Invalid logo URL. Only http and https protocols are allowed.",
      );
    }

    const value = company.trim().toLowerCase();

    const companyExists = await prisma.company.findFirst({
      where: {
        value,
        createdBy: user.id,
      },
    });

    if (companyExists && companyExists.id !== id) {
      throw new Error("Company already exists!");
    }

    const res = await prisma.company.update({
      where: {
        id,
        createdBy: user.id,
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
  companyId: string,
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
        createdBy: user.id,
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

export const deleteCompanyById = async (
  companyId: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const experiences = await prisma.workExperience.count({
      where: {
        companyId,
      },
    });
    if (experiences > 0) {
      throw new Error(
        `Company cannot be deleted due to its use in experience section of one of the resume! `,
      );
    }
    const jobs = await prisma.job.count({
      where: {
        companyId,
      },
    });

    if (jobs > 0) {
      throw new Error(
        `Company cannot be deleted due to ${jobs} number of associated jobs! `,
      );
    }

    const res = await prisma.company.delete({
      where: {
        id: companyId,
        createdBy: user.id,
      },
    });
    return { res, success: true };
  } catch (error) {
    const msg = "Failed to delete company.";
    return handleError(error, msg);
  }
};
