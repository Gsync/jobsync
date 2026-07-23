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
import { resumeDetailInclude } from "@/lib/jobs/resumeDetailInclude";
import {
  buildInsufficientSectionsMessage,
  hasMinResumeSections,
} from "@/lib/resumeSections";
import { buildCopyTitle, ensureUniqueTitle } from "@/lib/resumeCopyTitle";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import path from "path";
import fs from "fs";
import { writeFile } from "fs/promises";

// Canonical IDOR guard for actions that only need to confirm resume ownership
const assertResumeOwnership = async (resumeId: string, userId: string) => {
  const owned = await prisma.resume.findUnique({
    where: { id: resumeId, profile: { userId } },
    select: { id: true },
  });
  if (!owned) throw new Error("Resume not found or access denied");
};

const resumeListSelect = {
  id: true,
  profileId: true,
  FileId: true,
  createdAt: true,
  updatedAt: true,
  title: true,
  _count: {
    select: {
      Job: true,
      ResumeSections: true,
    },
  },
} as const;

// Full section tree for cloning. Unlike resumeDetailInclude this includes
// `others` and omits File/Tag joins, which a copy does not need.
const resumeCopySelect = {
  id: true,
  profileId: true,
  title: true,
  ContactInfo: true,
  ResumeSections: {
    include: {
      summary: true,
      workExperiences: true,
      educations: true,
      licenseOrCertifications: true,
      others: true,
      skills: true,
    },
  },
} as const;

export const getResumeList = async (
  page: number = 1,
  limit: number = APP_CONSTANTS.RECORDS_PER_PAGE,
  minSections: number = 0,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }
    const where = { profile: { userId: user.id } };

    const [userRow, total] = await Promise.all([
      prisma.user.findUnique({
        where: { id: user.id },
        select: { defaultResumeId: true },
      }),
      prisma.resume.count({ where }),
    ]);
    const defaultResumeId = userRow?.defaultResumeId ?? null;

    let rawData;
    if (minSections > 0) {
      // When filtering by section count, Prisma can't express ">= N
      // related rows" in `where`, so fetch all of the user's resumes and
      // filter in JS instead of applying skip/take.
      rawData = await prisma.resume.findMany({
        where,
        select: resumeListSelect,
        orderBy: { createdAt: "desc" },
      });
      if (defaultResumeId) {
        const defaultIndex = rawData.findIndex(
          (r) => r.id === defaultResumeId,
        );
        if (defaultIndex > 0) {
          const [defaultResume] = rawData.splice(defaultIndex, 1);
          rawData.unshift(defaultResume);
        }
      }
    } else if (defaultResumeId) {
      // Pin the default resume to the very first row so it always lands on
      // page 1, then page through the remaining resumes excluding it.
      const restWhere = { ...where, id: { not: defaultResumeId } };
      if (page === 1) {
        const [defaultResume, rest] = await Promise.all([
          prisma.resume.findFirst({
            where: { id: defaultResumeId, ...where },
            select: resumeListSelect,
          }),
          prisma.resume.findMany({
            where: restWhere,
            select: resumeListSelect,
            orderBy: { createdAt: "desc" },
            take: limit - 1,
          }),
        ]);
        rawData = defaultResume ? [defaultResume, ...rest] : rest;
      } else {
        rawData = await prisma.resume.findMany({
          where: restWhere,
          select: resumeListSelect,
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * limit - 1,
          take: limit,
        });
      }
    } else {
      rawData = await prisma.resume.findMany({
        where,
        select: resumeListSelect,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      });
    }

    const data =
      minSections > 0
        ? rawData.filter((r) => r._count.ResumeSections >= minSections)
        : rawData;

    return { data, total, success: true };
  } catch (error) {
    const msg = "Failed to get resume list.";
    return handleError(error, msg);
  }
};

export const getDefaultResumeId = async (): Promise<string | null> => {
  const user = await getCurrentUser();
  if (!user) return null;
  const row = await prisma.user.findUnique({
    where: { id: user.id },
    select: { defaultResumeId: true },
  });
  return row?.defaultResumeId ?? null;
};

export const setDefaultResume = async (
  resumeId: string,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Verify ownership before pointing the user at this resume.
    const owned = await prisma.resume.findFirst({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { _count: { select: { ResumeSections: true } } },
    });
    if (!owned) {
      throw new Error("Resume not found");
    }
    if (!hasMinResumeSections(owned._count.ResumeSections)) {
      return {
        success: false,
        message: buildInsufficientSectionsMessage(
          "setting this resume as default",
        ),
      };
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { defaultResumeId: resumeId },
    });

    return { success: true };
  } catch (error) {
    return (
      handleError(error, "Failed to set default resume.") ?? {
        success: false,
        message: "Failed to set default resume.",
      }
    );
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
      include: resumeDetailInclude,
    });
    return { data: resume, success: true };
  } catch (error) {
    const msg = "Failed to get resume.";
    return handleError(error, msg);
  }
};

export const saveResumeReviewResult = async (
  resumeId: string,
  reviewData: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    await prisma.resume.update({
      where: { id: resumeId, profile: { userId: user.id } },
      data: { reviewData },
    });

    return { success: true };
  } catch (error) {
    const msg = "Failed to save review result.";
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

    // Count before creating so we can auto-default the user's first resume.
    const resumeCount = await prisma.resume.count({
      where: { profile: { userId: user.id } },
    });

    const profile = await prisma.profile.findFirst({
      where: {
        userId: user.id,
      },
    });

    let res: any;
    let createdResumeId: string;
    if (profile && profile.id) {
      res = await prisma.resume.create({
        data: {
          profileId: profile!.id,
          title: uniqueTitle,
          FileId: fileName ? await createFileEntry(fileName, filePath) : null,
        },
      });
      createdResumeId = res.id;
    } else {
      // No profile yet: profile.create returns the profile, so pull the
      // created resume's id from the nested include.
      res = await prisma.profile.create({
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
        include: { resumes: { select: { id: true } } },
      });
      createdResumeId = res.resumes[0].id;
    }

    // Auto-default only the user's very first resume (decision #4/#5).
    if (resumeCount === 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: { defaultResumeId: createdResumeId },
      });
    }
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

export const getResumeCopyTitleSuggestion = async (
  resumeId: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    const source = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: { title: true },
    });
    if (!source) {
      throw new Error("Resume not found or access denied");
    }

    // All titles, not just the current page, so the suggestion never collides
    const existing = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });

    return {
      success: true,
      data: buildCopyTitle(
        source.title,
        existing.map((r) => r.title),
      ),
    };
  } catch (error) {
    const msg = "Failed to build a title for the copy.";
    return handleError(error, msg);
  }
};

export const copyResume = async (
  resumeId: string,
  title: string,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Read outside the transaction so the SQLite write lock is held briefly
    const source = await prisma.resume.findUnique({
      where: { id: resumeId, profile: { userId: user.id } },
      select: resumeCopySelect,
    });
    if (!source) {
      throw new Error("Resume not found or access denied");
    }

    if (!hasMinResumeSections(source.ResumeSections.length)) {
      throw new Error(buildInsufficientSectionsMessage("creating a copy"));
    }

    const existing = await prisma.resume.findMany({
      where: { profile: { userId: user.id } },
      select: { title: true },
    });
    const uniqueTitle = ensureUniqueTitle(
      title,
      existing.map((r) => r.title),
    );

    const created = await prisma.$transaction(
      async (tx) => {
        const newResume = await tx.resume.create({
          data: { profileId: source.profileId, title: uniqueTitle },
          select: { id: true },
        });

        if (source.ContactInfo) {
          const c = source.ContactInfo;
          await tx.contactInfo.create({
            data: {
              resumeId: newResume.id,
              firstName: c.firstName,
              lastName: c.lastName,
              headline: c.headline,
              email: c.email,
              phone: c.phone,
              address: c.address,
              url1: c.url1,
              url1Label: c.url1Label,
              url2: c.url2,
              url2Label: c.url2Label,
            },
          });
        }

        for (const section of source.ResumeSections) {
          const newSection = await tx.resumeSection.create({
            data: {
              // Connect (not resumeId) because Prisma forbids mixing a scalar
              // FK with the nested summary create below
              Resume: { connect: { id: newResume.id } },
              sectionTitle: section.sectionTitle,
              sectionType: section.sectionType,
              // Summary is 1:1 via summaryId, so nest it with the section
              ...(section.summary
                ? { summary: { create: { content: section.summary.content } } }
                : {}),
            },
            select: { id: true },
          });

          if (section.workExperiences.length > 0) {
            await tx.workExperience.createMany({
              data: section.workExperiences.map((w) => ({
                resumeSectionId: newSection.id,
                companyId: w.companyId,
                jobTitleId: w.jobTitleId,
                locationId: w.locationId,
                startDate: w.startDate,
                endDate: w.endDate,
                description: w.description,
              })),
            });
          }

          if (section.educations.length > 0) {
            await tx.education.createMany({
              data: section.educations.map((e) => ({
                resumeSectionId: newSection.id,
                institution: e.institution,
                degree: e.degree,
                fieldOfStudy: e.fieldOfStudy,
                locationId: e.locationId,
                startDate: e.startDate,
                endDate: e.endDate,
                description: e.description,
              })),
            });
          }

          if (section.licenseOrCertifications.length > 0) {
            await tx.licenseOrCertification.createMany({
              data: section.licenseOrCertifications.map((l) => ({
                resumeSectionId: newSection.id,
                title: l.title,
                organization: l.organization,
                issueDate: l.issueDate,
                expirationDate: l.expirationDate,
                credentialUrl: l.credentialUrl,
              })),
            });
          }

          if (section.others.length > 0) {
            await tx.otherSection.createMany({
              data: section.others.map((o) => ({
                resumeSectionId: newSection.id,
                title: o.title,
                content: o.content,
              })),
            });
          }

          if (section.skills.length > 0) {
            await tx.skill.createMany({
              data: section.skills.map((s) => ({
                resumeSectionId: newSection.id,
                tagId: s.tagId,
                category: s.category,
                order: s.order,
              })),
            });
          }
        }

        return newResume;
      },
      { timeout: 15000 },
    );

    return { success: true, data: { id: created.id, title: uniqueTitle } };
  } catch (error) {
    const msg = "Failed to copy resume.";
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

    await assertResumeOwnership(data.resumeId!, user.id);

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

export const addSkillsSection = async (
  data: z.infer<typeof AddSkillsFormSchema>,
): Promise<any | undefined> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    await assertResumeOwnership(data.resumeId, user.id);

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
