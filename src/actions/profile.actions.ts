"use server";
import prisma from "@/lib/db";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { z } from "zod";

export const createResumeProfile = async (
  data: z.infer<typeof CreateResumeFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { title } = data;

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    const res =
      profile && profile.id
        ? await prisma.resume.create({
            data: {
              profileId: profile!.id,
              title,
            },
          })
        : await prisma.profile.create({
            data: {
              userId: user.id,
              resumes: {
                create: [
                  {
                    title,
                  },
                ],
              },
            },
          });
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create resume.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

// export const editResumeTitle = async (
//   data: z.infer<typeof CreateResumeFormSchema>
// ): Promise<any | undefined> => {
//   try {
//     const user = await getCurrentUser();

//     if (!user) {
//       throw new Error("Not authenticated");
//     }

//     const { id, company, logoUrl, createdBy } = data;

//     if (!id || user.id != createdBy) {
//       throw new Error("Id is not provided or no user privilages");
//     }

//     const value = company.trim().toLowerCase();

//     const companyExists = await prisma.company.findUnique({
//       where: {
//         value,
//       },
//     });

//     if (companyExists) {
//       throw new Error("Company already exists!");
//     }

//     const res = await prisma.company.update({
//       where: {
//         id,
//       },
//       data: {
//         value,
//         label: company,
//         logoUrl,
//       },
//     });

//     return { success: true, data: res };
//   } catch (error) {
//     const msg = "Failed to update company.";
//     console.error(msg, error);
//     if (error instanceof Error) {
//       return { success: false, message: error.message };
//     }
//   }
// };
