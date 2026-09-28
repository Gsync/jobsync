"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddCertificationFormSchema } from "@/models/addCertificationForm.schema";
import { SectionType } from "@/models/profile.model";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertResumeOwnership, requireUser } from "./shared";

export const addCertification = async (
  data: z.infer<typeof AddCertificationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    await assertResumeOwnership(data.resumeId!, user.id);

    const section = !data.sectionId
      ? await prisma.resumeSection.create({
          data: {
            resumeId: data.resumeId!,
            sectionTitle: data.sectionTitle!,
            sectionType: SectionType.CERTIFICATION,
          },
        })
      : undefined;

    const result = await prisma.resumeSection.update({
      where: {
        id: section ? section.id : data.sectionId,
        resumeId: data.resumeId!,
      },
      data: {
        licenseOrCertifications: {
          create: {
            title: data.title,
            organization: data.organization,
            issueDate: data.issueDate,
            expirationDate: data.expirationDate,
            credentialUrl: data.credentialUrl,
          },
        },
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: result, success: true };
  } catch (error) {
    const msg = "Failed to create certification.";
    return handleError(error, msg);
  }
};

export const updateCertification = async (
  data: z.infer<typeof AddCertificationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const result = await prisma.licenseOrCertification.update({
      where: {
        id: data.id,
        ResumeSection: { Resume: { profile: { userId: user.id } } },
      },
      data: {
        title: data.title,
        organization: data.organization,
        issueDate: data.issueDate,
        expirationDate: data.noExpiration ? null : (data.expirationDate ?? null),
        credentialUrl: data.credentialUrl,
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: result, success: true };
  } catch (error) {
    const msg = "Failed to update certification.";
    return handleError(error, msg);
  }
};

export const deleteCertification = async (
  certificationId: string,
): Promise<any | undefined> => {
  try {
    const user = await requireUser();

    const cert = await prisma.licenseOrCertification.findFirst({
      where: {
        id: certificationId,
        ResumeSection: { Resume: { profile: { userId: user.id } } },
      },
      select: {
        id: true,
        resumeSectionId: true,
        ResumeSection: { select: { resumeId: true } },
      },
    });
    if (!cert) throw new Error("Certification not found or access denied");

    await prisma.$transaction(async (tx) => {
      await tx.licenseOrCertification.delete({ where: { id: cert.id } });
      // Drop the section with its last entry so no empty heading lingers
      const remaining = await tx.licenseOrCertification.count({
        where: { resumeSectionId: cert.resumeSectionId },
      });
      if (remaining === 0) {
        await tx.resumeSection.delete({
          where: { id: cert.resumeSectionId! },
        });
      }
    });

    revalidatePath(`/dashboard/profile/resume/${cert.ResumeSection?.resumeId}`);
    return { success: true };
  } catch (error) {
    return handleError(error, "Failed to delete certification.");
  }
};
