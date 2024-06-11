"use server";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";

export const getCompanyList = async (
  countBy?: string
): Promise<any | undefined> => {
  try {
    const companies = await prisma.company.findMany({
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
    });
    return companies;
  } catch (error) {
    const msg = "Failed to fetch company list. ";
    console.error(msg, error);
    throw new Error(msg);
  }
};
