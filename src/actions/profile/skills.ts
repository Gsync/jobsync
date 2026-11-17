"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { SectionType } from "@/models/profile.model";
import {
  AddSkillsFormSchema,
  UpdateSkillsFormSchema,
} from "@/models/skills.schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertTagsOwned } from "../shared";
import { assertResumeOwnership, requireUser } from "./shared";

export const addSkillsSection = async (
  data: z.infer<typeof AddSkillsFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await assertResumeOwnership(data.resumeId, user.id);
    await assertTagsOwned(
      data.categories.flatMap((cat) => cat.tagIds),
      user.id,
    );

    const section = await prisma.resumeSection.create({
      data: {
        resumeId: data.resumeId,
        sectionTitle: data.sectionTitle,
        sectionType: SectionType.SKILLS,
      },
    });

    let order = 0;
    const skillRows = data.categories.flatMap((cat) =>
      cat.tagIds.map((tagId) => ({
        tagId,
        category: cat.label?.trim() || null,
        order: order++,
        resumeSectionId: section.id,
      })),
    );

    await prisma.skill.createMany({ data: skillRows });

    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { success: true, data: section };
  } catch (error) {
    return handleError(error, "Failed to add skills section.");
  }
};

export const updateSkillsSection = async (
  data: z.infer<typeof UpdateSkillsFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const section = await prisma.resumeSection.findFirst({
      where: {
        id: data.sectionId,
        Resume: { profile: { userId: user.id } },
      },
      select: { id: true, resumeId: true },
    });
    if (!section) throw new Error("Section not found or access denied");
    await assertTagsOwned(
      data.categories.flatMap((cat) => cat.tagIds),
      user.id,
    );

    let order = 0;
    const skillRows = data.categories.flatMap((cat) =>
      cat.tagIds.map((tagId) => ({
        tagId,
        category: cat.label?.trim() || null,
        order: order++,
        resumeSectionId: section.id,
      })),
    );

    await prisma.$transaction([
      prisma.skill.deleteMany({ where: { resumeSectionId: section.id } }),
      prisma.resumeSection.update({
        where: { id: section.id },
        data: { sectionTitle: data.sectionTitle },
      }),
      prisma.skill.createMany({ data: skillRows }),
    ]);

    revalidatePath(`/dashboard/profile/resume/${section.resumeId}`);
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to update skills section.");
  }
};

export const deleteSkillsSection = async (
  sectionId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const section = await prisma.resumeSection.findFirst({
      where: {
        id: sectionId,
        Resume: { profile: { userId: user.id } },
      },
      select: { id: true, resumeId: true },
    });
    if (!section) throw new Error("Section not found or access denied");

    await prisma.$transaction([
      prisma.skill.deleteMany({ where: { resumeSectionId: section.id } }),
      prisma.resumeSection.delete({ where: { id: section.id } }),
    ]);

    revalidatePath(`/dashboard/profile/resume/${section.resumeId}`);
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete skills section.");
  }
};
