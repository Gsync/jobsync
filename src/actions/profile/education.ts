"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddEducationFormSchema } from "@/models/AddEductionForm.schema";
import { SectionType } from "@/models/profile.model";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertResumeOwnership, requireUser } from "./shared";

export const addEducation = async (
  data: z.infer<typeof AddEducationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await assertResumeOwnership(data.resumeId!, user.id);

    const section = !data.sectionId
      ? await prisma.resumeSection.create({
          data: {
            resumeId: data.resumeId!,
            sectionTitle: data.sectionTitle!,
            sectionType: SectionType.EDUCATION,
          },
        })
      : undefined;

    const education = await prisma.resumeSection.update({
      where: {
        id: section ? section.id : data.sectionId,
        resumeId: data.resumeId!,
      },
      data: {
        educations: {
          create: {
            institution: data.institution,
            degree: data.degree,
            fieldOfStudy: data.fieldOfStudy,
            locationId: data.location,
            startDate: data.startDate,
            endDate: data.endDate,
            description: data.description,
            showDates: data.showDates ?? true,
          },
        },
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: education, success: true };
  } catch (error) {
    const msg = "Failed to create education.";
    return handleError(error, msg);
  }
};

export const updateEducation = async (
  data: z.infer<typeof AddEducationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const summary = await prisma.education.update({
      where: {
        id: data.id,
        ResumeSection: { Resume: { profile: { userId: user.id } } },
      },
      data: {
        institution: data.institution,
        degree: data.degree,
        fieldOfStudy: data.fieldOfStudy,
        locationId: data.location,
        startDate: data.startDate,
        endDate: data.endDate,
        description: data.description,
        showDates: data.showDates ?? true,
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update education.";
    return handleError(error, msg);
  }
};
