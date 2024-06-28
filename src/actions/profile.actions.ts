"use server";
import prisma from "@/lib/db";
import { AddContactInfoFormSchema } from "@/models/addContactInfoForm.schema";
import { AddSummarySectionFormSchema } from "@/models/addSummaryForm.schema";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { ResumeSection, SectionType, Summary } from "@/models/profile.model";
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
        ResumeSections: {
          include: {
            summary: true,
          },
        },
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

export const editResume = async (
  data: z.infer<typeof CreateResumeFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const { id, title } = data;

    const res = await prisma.resume.update({
      where: {
        id,
      },
      data: {
        title,
      },
    });

    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update resume.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

export const addResumeSummary = async (
  data: z.infer<typeof AddSummarySectionFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const res = await prisma.resumeSection.create({
      data: {
        resumeId: data.resumeId!,
        sectionTitle: data.sectionTitle!,
        sectionType: SectionType.SUMMARY,
      },
    });

    const summary = await prisma.resumeSection.update({
      where: {
        id: res.id,
      },
      data: {
        summary: {
          create: {
            content: data.content!,
          },
        },
      },
    });
    revalidatePath("/dashboard/profile/resume/[id]");
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to create summary.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};

export const updateResumeSummary = async (
  data: z.infer<typeof AddSummarySectionFormSchema>
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const res = await prisma.resumeSection.update({
      where: {
        id: data.id,
      },
      data: {
        sectionTitle: data.sectionTitle!,
      },
    });

    const summary = await prisma.resumeSection.update({
      where: {
        id: data.id,
      },
      data: {
        summary: {
          update: {
            content: data.content!,
          },
        },
      },
    });
    revalidatePath("/dashboard/profile/resume/[id]");
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update summary.";
    console.error(msg, error);
    if (error instanceof Error) {
      return { success: false, message: error.message };
    }
  }
};
