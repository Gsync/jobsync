"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { AddEducationFormSchema } from "@/models/AddEductionForm.schema";
import { AddContactInfoFormSchema } from "@/models/addContactInfoForm.schema";
import { AddCertificationFormSchema } from "@/models/addCertificationForm.schema";
import { AddExperienceFormSchema } from "@/models/addExperienceForm.schema";
import { AddSummarySectionFormSchema } from "@/models/addSummaryForm.schema";
import { CreateResumeFormSchema } from "@/models/createResumeForm.schema";
import { ResumeSection, SectionType, Summary } from "@/models/profile.model";
import {
  AddSkillsFormSchema,
  UpdateSkillsFormSchema,
} from "@/models/skills.schema";
import { getCurrentUser } from "@/utils/user.utils";
import { APP_CONSTANTS } from "@/lib/constants";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

export const getResumeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
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
        select: {
          id: true,
          profileId: true,
          FileId: true,
          createdAt: true,
          updatedAt: true,
          title: true,
          _count: {
            select: {
              Job: true,
            },
          },
        },
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
    return handleError(error, msg);
  }
};

export const getResumeById = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    if (!resumeId) {
      throw new Error("Please provide resume id");
    }
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const resume = await prisma.resume.findUnique({
      where: {
        id: resumeId,
        profile: { userId: user.id },
      },
      include: {
        ContactInfo: true,
        File: true,
        ResumeSections: {
          include: {
            summary: true,
            workExperiences: {
              include: {
                jobTitle: true,
                Company: true,
                location: true,
              },
            },
            educations: {
              include: {
                location: true,
              },
            },
            licenseOrCertifications: true,
            skills: { include: { Tag: true } },
          },
        },
      },
    });
    return { data: resume, success: true };
  } catch (error) {
    const msg = "Failed to get resume.";
    return handleError(error, msg);
  }
};

export const addContactInfo = async (
  data: z.infer<typeof AddContactInfoFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.resume.update({
      where: {
        id: data.resumeId,
        profile: { userId: user.id },
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
              url1: data.url1 || null,
              url1Label: data.url1Label || null,
              url2: data.url2 || null,
              url2Label: data.url2Label || null,
            },
          },
        },
      },
    });
    revalidatePath("/dashboard/profile/resume");
    return { data: res, success: true };
  } catch (error) {
    const msg = "Failed to create contact info.";
    return handleError(error, msg);
  }
};

export const updateContactInfo = async (
  data: z.infer<typeof AddContactInfoFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.contactInfo.update({
      where: {
        id: data.id,
        resume: { profile: { userId: user.id } },
      },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        email: data.email!,
        phone: data.phone!,
        address: data.address,
        url1: data.url1 || null,
        url1Label: data.url1Label || null,
        url2: data.url2 || null,
        url2Label: data.url2Label || null,
      },
    });
    revalidatePath("/dashboard/profile/resume");
    return { data: res, success: true };
  } catch (error) {
    const msg = "Failed to update contact info.";
    return handleError(error, msg);
  }
};

export const createResumeProfile = async (
  title: string,
  fileName: string,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Build a unique title: if base title is taken, append (2), (3), …
    const existingTitles = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });
    const taken = new Set(existingTitles.map((r) => r.title.toLowerCase()));
    const base = title.trim();
    let uniqueTitle = base;
    let counter = 2;
    while (taken.has(uniqueTitle.toLowerCase())) {
      uniqueTitle = `${base} (${counter++})`;
    }

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
              title: uniqueTitle,
              FileId: fileName
                ? await createFileEntry(fileName, filePath)
                : null,
            },
          })
        : await prisma.profile.create({
            data: {
              userId: user.id,
              resumes: {
                create: [
                  {
                    title: uniqueTitle,
                    FileId: fileName
                      ? await createFileEntry(fileName, filePath)
                      : null,
                  },
                ],
              },
            },
          });
    // revalidatePath("/dashboard/myjobs", "page");
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to create resume.";
    return handleError(error, msg);
  }
};

const createFileEntry = async (
  fileName: string | undefined,
  filePath: string | undefined,
) => {
  const newFileEntry = await prisma.file.create({
    data: {
      fileName: fileName!,
      filePath: filePath!,
      fileType: "resume",
    },
  });
  return newFileEntry.id;
};

export const editResume = async (
  id: string,
  title: string,
  fileId?: string,
  fileName?: string,
  filePath?: string,
): Promise<any | undefined> => {
  try {
    let resolvedFileId = fileId;

    if (!fileId && fileName && filePath) {
      resolvedFileId = await createFileEntry(fileName, filePath);
    }

    if (resolvedFileId) {
      const isValidFileId = await prisma.file.findFirst({
        where: { id: resolvedFileId },
      });

      if (!isValidFileId) {
        throw new Error(
          `The provided FileId "${resolvedFileId}" does not exist.`,
        );
      }
    }

    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const res = await prisma.resume.update({
      where: { id, profile: { userId: user.id } },
      data: {
        title,
        FileId: resolvedFileId || null,
      },
    });
    return { success: true, data: res };
  } catch (error) {
    const msg = "Failed to update resume or file.";
    return handleError(error, msg);
  }
};

export const deleteResumeById = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify ownership and get associated fileId
    const resume = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { FileId: true },
    });

    if (!resume) {
      throw new Error("Resume not found or access denied");
    }

    // Delete disk file + DB record before the resume row (avoid orphan on cascade failure)
    if (resume.FileId) {
      await deleteFile(resume.FileId);
    }

    await prisma.$transaction(async (tx) => {
      await tx.contactInfo.deleteMany({ where: { resumeId } });

      await tx.summary.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.workExperience.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.education.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.licenseOrCertification.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.skill.deleteMany({
        where: { ResumeSection: { resumeId } },
      });
      await tx.resumeSection.deleteMany({ where: { resumeId } });

      await tx.resume.delete({
        where: { id: resumeId, profile: { userId: user.id } },
      });
    });
    return { success: true };
  } catch (error) {
    const msg = "Failed to delete resume.";
    return handleError(error, msg);
  }
};

export const uploadFile = async (file: File, dir: string, path: string) => {
  const bytes = await file.arrayBuffer();
  const buffer = new Uint8Array(bytes);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await writeFile(path, buffer);
};

export const deleteFile = async (fileId: string) => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const file = await prisma.file.findFirst({
    where: {
      id: fileId,
      Resume: { profile: { userId: user.id } },
    },
  });

  if (!file) {
    throw new Error("File not found or access denied");
  }

  if (fs.existsSync(file.filePath)) {
    fs.unlinkSync(file.filePath);
  }

  await prisma.file.delete({ where: { id: fileId } });
};

export const addResumeSummary = async (
  data: z.infer<typeof AddSummarySectionFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const owned = await prisma.resume.findUnique({
      where: { id: data.resumeId!, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

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
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to create summary.";
    return handleError(error, msg);
  }
};

export const updateResumeSummary = async (
  data: z.infer<typeof AddSummarySectionFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    const res = await prisma.resumeSection.update({
      where: {
        id: data.id,
        Resume: { profile: { userId: user.id } },
      },
      data: {
        sectionTitle: data.sectionTitle!,
      },
    });

    const summary = await prisma.resumeSection.update({
      where: {
        id: data.id,
        Resume: { profile: { userId: user.id } },
      },
      data: {
        summary: {
          update: {
            content: data.content!,
          },
        },
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update summary.";
    return handleError(error, msg);
  }
};

export const addExperience = async (
  data: z.infer<typeof AddExperienceFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const owned = await prisma.resume.findUnique({
      where: { id: data.resumeId!, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    // const res = await prisma.resumeSection.update({
    //   where: {
    //     id: data.id,
    //   },
    //   data: {
    //     sectionTitle: data.sectionTitle!,
    //   },
    // });

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
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update experience.";
    return handleError(error, msg);
  }
};

export const addEducation = async (
  data: z.infer<typeof AddEducationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const owned = await prisma.resume.findUnique({
      where: { id: data.resumeId!, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }
    // const res = await prisma.resumeSection.update({
    //   where: {
    //     id: data.id,
    //   },
    //   data: {
    //     sectionTitle: data.sectionTitle!,
    //   },
    // });

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
      },
    });
    revalidatePath(`/dashboard/profile/resume/${data.resumeId}`);
    return { data: summary, success: true };
  } catch (error) {
    const msg = "Failed to update education.";
    return handleError(error, msg);
  }
};

export const addCertification = async (
  data: z.infer<typeof AddCertificationFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const owned = await prisma.resume.findUnique({
      where: { id: data.resumeId!, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

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
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    const result = await prisma.licenseOrCertification.update({
      where: {
        id: data.id,
        ResumeSection: { Resume: { profile: { userId: user.id } } },
      },
      data: {
        title: data.title,
        organization: data.organization,
        issueDate: data.issueDate,
        expirationDate: data.expirationDate,
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

export const addSkillsSection = async (
  data: z.infer<typeof AddSkillsFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const owned = await prisma.resume.findUnique({
      where: { id: data.resumeId, profile: { userId: user.id } },
      select: { id: true },
    });
    if (!owned) throw new Error("Resume not found or access denied");

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
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    const section = await prisma.resumeSection.findFirst({
      where: {
        id: data.sectionId,
        Resume: { profile: { userId: user.id } },
      },
      select: { id: true, resumeId: true },
    });
    if (!section) throw new Error("Section not found or access denied");

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
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

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
