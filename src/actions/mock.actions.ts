"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { generateMockActivities } from "@/lib/mock.utils";
import {
  mockActivityTypes,
  MOCK_DATA_IDENTIFIER,
} from "@/lib/data/mockActivities";
import {
  mockCompanies,
  mockLocations,
  mockJobTitles,
  mockResumePeople,
  MOCK_VALUE_PREFIX,
} from "@/lib/data/mockProfileData";
import { subYears } from "date-fns";

export const generateMockActivitiesAction = async (): Promise<any> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if dev mode is enabled
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "Mock data generation is only available in development mode",
      );
    }

    // Check which activity types already exist
    const existingTypes = await prisma.activityType.findMany({
      where: {
        value: {
          in: mockActivityTypes.map((t) => t.value),
        },
      },
    });

    const existingValues = new Set(existingTypes.map((t) => t.value));

    // Create only the activity types that don't exist
    const typesToCreate = mockActivityTypes.filter(
      (t) => !existingValues.has(t.value),
    );

    if (typesToCreate.length > 0) {
      await prisma.activityType.createMany({
        data: typesToCreate.map((t) => ({
          label: t.label,
          value: t.value,
          createdBy: user.id,
        })),
      });
    }

    // Get all activity type IDs (both existing and newly created)
    const activityTypes = await prisma.activityType.findMany({
      where: {
        value: {
          in: mockActivityTypes.map((t) => t.value),
        },
      },
    });

    // Generate mock activities
    const mockActivities = generateMockActivities(user.id, 10, 25);

    // Create a map of activity type values to IDs
    const typeMap = new Map(activityTypes.map((t) => [t.value, t.id]));

    // Create activities in the database
    const createdActivities = await Promise.all(
      mockActivities.map((activity) => {
        const typeValue = activity.activityType as string;
        const typeId = typeMap.get(typeValue);

        if (!typeId) {
          throw new Error(`Activity type not found for ${typeValue}`);
        }

        return prisma.activity.create({
          data: {
            activityName: activity.activityName,
            activityTypeId: typeId,
            userId: user.id,
            startTime: activity.startTime,
            endTime: activity.endTime,
            duration: activity.duration,
            description: activity.description,
          },
        });
      }),
    );

    return {
      success: true,
      message: `Generated ${createdActivities.length} mock activities`,
      data: createdActivities,
    };
  } catch (error) {
    const msg = "Failed to generate mock activities";
    return handleError(error, msg);
  }
};

export const clearMockActivitiesAction = async (): Promise<any> => {
  try {
    const user = await getCurrentUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    // Check if dev mode is enabled
    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "Mock data clearing is only available in development mode",
      );
    }

    // Find and delete only mock activities (those with [MOCK_DATA] in description)
    const mockActivities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        description: {
          contains: MOCK_DATA_IDENTIFIER,
        },
      },
    });

    // Delete the activities
    const deleteResult = await prisma.activity.deleteMany({
      where: {
        id: {
          in: mockActivities.map((a) => a.id),
        },
      },
    });

    return {
      success: true,
      message: `Deleted ${deleteResult.count} mock activities`,
      deletedCount: deleteResult.count,
    };
  } catch (error) {
    const msg = "Failed to clear mock activities";
    return handleError(error, msg);
  }
};

export const generateMockProfileDataAction = async (): Promise<any> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "Mock data generation is only available in development mode",
      );
    }

    // 1. Upsert companies
    await Promise.all(
      mockCompanies.map((c) =>
        prisma.company.upsert({
          where: { value_createdBy: { value: c.value, createdBy: user.id } },
          update: {},
          create: { label: c.label, value: c.value, createdBy: user.id },
        }),
      ),
    );

    const companies = await prisma.company.findMany({
      where: {
        value: { in: mockCompanies.map((c) => c.value) },
        createdBy: user.id,
      },
    });
    const companyMap = new Map(companies.map((c) => [c.value, c.id]));

    // 2. Upsert locations
    await Promise.all(
      mockLocations.map((l) =>
        prisma.location.upsert({
          where: { value_createdBy: { value: l.value, createdBy: user.id } },
          update: {},
          create: {
            label: l.label,
            value: l.value,
            stateProv: l.stateProv,
            country: l.country,
            createdBy: user.id,
          },
        }),
      ),
    );

    const locations = await prisma.location.findMany({
      where: {
        value: { in: mockLocations.map((l) => l.value) },
        createdBy: user.id,
      },
    });
    const locationMap = new Map(locations.map((l) => [l.value, l.id]));

    // 3. Upsert job titles
    await Promise.all(
      mockJobTitles.map((jt) =>
        prisma.jobTitle.upsert({
          where: { value_createdBy: { value: jt.value, createdBy: user.id } },
          update: {},
          create: { label: jt.label, value: jt.value, createdBy: user.id },
        }),
      ),
    );

    const jobTitles = await prisma.jobTitle.findMany({
      where: {
        value: { in: mockJobTitles.map((jt) => jt.value) },
        createdBy: user.id,
      },
    });
    const jobTitleMap = new Map(jobTitles.map((jt) => [jt.value, jt.id]));

    // 4. Find or create profile for the user
    let profile = await prisma.profile.findFirst({
      where: { userId: user.id },
    });
    if (!profile) {
      profile = await prisma.profile.create({ data: { userId: user.id } });
    }

    // 5. Create resumes, skipping any that already exist
    let created = 0;
    let skipped = 0;

    for (const person of mockResumePeople) {
      const existing = await prisma.resume.findFirst({
        where: { profileId: profile.id, title: person.resumeTitle },
      });
      if (existing) {
        skipped++;
        continue;
      }

      const resume = await prisma.resume.create({
        data: { profileId: profile.id, title: person.resumeTitle },
      });

      // Contact info
      await prisma.contactInfo.create({
        data: {
          resumeId: resume.id,
          firstName: person.firstName,
          lastName: person.lastName,
          headline: person.headline,
          email: person.email,
          phone: person.phone,
          address: person.address,
        },
      });

      // Summary section
      const summary = await prisma.summary.create({
        data: { content: person.summary },
      });
      await prisma.resumeSection.create({
        data: {
          resumeId: resume.id,
          sectionTitle: "Summary",
          sectionType: "summary",
          summaryId: summary.id,
        },
      });

      // Work experience section
      const workSection = await prisma.resumeSection.create({
        data: {
          resumeId: resume.id,
          sectionTitle: "Work Experience",
          sectionType: "experience",
        },
      });

      for (const entry of person.workHistory) {
        const companyId = companyMap.get(entry.company)!;
        const jobTitleId = jobTitleMap.get(entry.jobTitleValue)!;
        const locationId = locationMap.get(entry.location)!;
        const startDate = subYears(new Date(), entry.startYearsAgo);
        const endDate =
          entry.endYearsAgo === null
            ? null
            : subYears(new Date(), entry.endYearsAgo);

        await prisma.workExperience.create({
          data: {
            companyId,
            jobTitleId,
            locationId,
            startDate,
            endDate,
            description: entry.description,
            resumeSectionId: workSection.id,
          },
        });
      }

      // Education section
      const educationSection = await prisma.resumeSection.create({
        data: {
          resumeId: resume.id,
          sectionTitle: "Education",
          sectionType: "education",
        },
      });

      await prisma.education.create({
        data: {
          institution: person.education.institution,
          degree: person.education.degree,
          fieldOfStudy: person.education.fieldOfStudy,
          startDate: new Date(`${person.education.startYear}-09-01`),
          endDate: new Date(`${person.education.endYear}-05-01`),
          locationId: locationMap.get(person.education.location)!,
          resumeSectionId: educationSection.id,
        },
      });

      created++;
    }

    return {
      success: true,
      message: `Generated ${created} resumes (${skipped} already existed). Created ${mockCompanies.length} companies, ${mockLocations.length} locations, ${mockJobTitles.length} job titles.`,
    };
  } catch (error) {
    return handleError(error, "Failed to generate mock profile data");
  }
};

export const clearMockProfileDataAction = async (): Promise<any> => {
  try {
    const user = await getCurrentUser();
    if (!user) throw new Error("Not authenticated");

    if (process.env.NODE_ENV !== "development") {
      throw new Error(
        "Mock data clearing is only available in development mode",
      );
    }

    // Find mock resumes belonging to the user
    const mockResumes = await prisma.resume.findMany({
      where: {
        title: { contains: "[MOCK_DATA]" },
        profile: { userId: user.id },
      },
      include: {
        ResumeSections: { select: { id: true, summaryId: true } },
      },
    });

    const resumeIds = mockResumes.map((r) => r.id);
    const sectionIds = mockResumes.flatMap((r) =>
      r.ResumeSections.map((s) => s.id),
    );
    const summaryIds = mockResumes
      .flatMap((r) => r.ResumeSections)
      .filter((s) => s.summaryId)
      .map((s) => s.summaryId!);

    // Delete child records first to satisfy FK constraints
    await prisma.workExperience.deleteMany({
      where: { resumeSectionId: { in: sectionIds } },
    });
    await prisma.education.deleteMany({
      where: { resumeSectionId: { in: sectionIds } },
    });
    await prisma.licenseOrCertification.deleteMany({
      where: { resumeSectionId: { in: sectionIds } },
    });
    await prisma.otherSection.deleteMany({
      where: { resumeSectionId: { in: sectionIds } },
    });
    await prisma.resumeSection.deleteMany({
      where: { id: { in: sectionIds } },
    });
    if (summaryIds.length > 0) {
      await prisma.summary.deleteMany({ where: { id: { in: summaryIds } } });
    }
    await prisma.contactInfo.deleteMany({
      where: { resumeId: { in: resumeIds } },
    });
    await prisma.resume.deleteMany({ where: { id: { in: resumeIds } } });

    // Remove mock companies, locations, job titles (best-effort)
    const [deletedCompanies, deletedLocations, deletedJobTitles] =
      await Promise.allSettled([
        prisma.company.deleteMany({
          where: {
            value: { startsWith: MOCK_VALUE_PREFIX },
            createdBy: user.id,
          },
        }),
        prisma.location.deleteMany({
          where: {
            value: { startsWith: MOCK_VALUE_PREFIX },
            createdBy: user.id,
          },
        }),
        prisma.jobTitle.deleteMany({
          where: {
            value: { startsWith: MOCK_VALUE_PREFIX },
            createdBy: user.id,
          },
        }),
      ]);

    const companiesCount =
      deletedCompanies.status === "fulfilled"
        ? deletedCompanies.value.count
        : 0;
    const locationsCount =
      deletedLocations.status === "fulfilled"
        ? deletedLocations.value.count
        : 0;
    const titlesCount =
      deletedJobTitles.status === "fulfilled"
        ? deletedJobTitles.value.count
        : 0;

    return {
      success: true,
      message: `Deleted ${resumeIds.length} resumes, ${companiesCount} companies, ${locationsCount} locations, ${titlesCount} job titles.`,
    };
  } catch (error) {
    return handleError(error, "Failed to clear mock profile data");
  }
};
