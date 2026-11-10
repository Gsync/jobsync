"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddExperienceFormSchema } from "@/models/addExperienceForm.schema";
import { SectionType } from "@/models/profile.model";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertResumeOwnership, requireUser } from "./shared";

export const addExperience = async (
  data: z.infer<typeof AddExperienceFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await assertResumeOwnership(data.resumeId!, user.id);

    if (!data.sectionId && !data.sectionTitle) {
      throw new Error("SectionTitle is required.");
    }

    const section = !data.sectionId
      ? await prisma.resumeSection.create({
          data: {
            resumeId: data.resumeId!,
            sectionTitle: data.sectionTitle!,
            sectionType: SectionType.EXPERIENCE,
          },
        })
      : undefined;

    const experience = await prisma.resumeSection.update({
      where: {
        id: section ? section.id : data.sectionId,
        resumeId: data.resumeId!,
      },
      data: {
        workExperiences: {
          create: {
            jobTitleId: data.title,
            companyId: data.company,
            locationId: data.location,
            startDate: data.startDate,
            endDate: data.endDate,
            description: data.jobDescription,
            showLocation: data.showLocation ?? true,
          },
        },
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: experience, success: true };
  } catch (error) {
    const msg = "Failed to create experience.";
    return handleError(error, msg);
  }
};

export const updateExperience = async (
  data: z.infer<typeof AddExperienceFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const summary = await prisma.workExperience.update({
      where: {
        id: data.id,
        ResumeSection: { Resume: { profile: { userId: user.id } } },
      },
      data: {
        jobTitleId: data.title,
        companyId: data.company,
        locationId: data.location,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.jobDescription,
        showLocation: data.showLocation ?? true,
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update experience.";
    return handleError(error, msg);
  }
};
