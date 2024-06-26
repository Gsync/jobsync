"use server";
import prisma from "@/lib/db";
import { AddContactInfoFormSchema } from "@/models/addContactInfoForm.schema";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export const getResumeList = async (
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
      prisma.resume.findMany({
        where: {
          profile: {
            userId: user.id,
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.resume.count({
        where: {
          profile: {
            userId: user.id,
          },
        },
      }),
    ]);
    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get resume list.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

export const getResumeById = async (
  resumeId: string
): Promise<any | undefined> => {
  try {
    if (!resumeId) {
      throw new Error("Please provide resume id");
    }
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const resume = prisma.resume.findUnique({
      where: {
        id: resumeId,
      },
      include: {
        ContactInfo: true,
      },
    });
    return resume;
  } catch (error) {
    const msg = "Failed to get resume.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

export const addContactInfo = async (
  data: z.infer<typeof AddContactInfoFormSchema>
): Promise<any | undefined> => {
  console.log("Add contact info: ", data);
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.resume.update({
      where: {
        id: data.resumeId,
      },
      data: {
        ContactInfo: {
          connectOrCreate: {
            where: { resumeId: data.resumeId },
            create: {
              firstName: data.firstName,
              lastName: data.lastName,
              headline: data.headline,
              email: data.email!,
              phone: data.phone!,
              address: data.address,
            },
          },
        },
      },
    });
    revalidatePath("/dashboard/profile/resume");
    return { data: res, success: true };
  } catch (error) {
    const msg = "Failed to create contact info.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

export const updateContactInfo = async (
  data: z.infer<typeof AddContactInfoFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.contactInfo.update({
      where: {
        id: data.id,
      },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        email: data.email!,
        phone: data.phone!,
        address: data.address,
      },
    });
    revalidatePath("/dashboard/profile/resume");
    return { data: res, success: true };
  } catch (error) {
    const msg = "Failed to update contact info.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

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
    revalidatePath("/dashboard/profile");
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
