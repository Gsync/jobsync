"use server";
import prisma from "@/lib/db";
import { handleError } from "@/lib/utils";
import { getCurrentUser } from "@/utils/user.utils";
import { generateMockActivities } from "@/lib/mock.utils";
import {
  mockActivityTypes,
  MOCK_DATA_IDENTIFIER,
} from "@/lib/data/mockActivities";

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
